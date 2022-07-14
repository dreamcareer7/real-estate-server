const _ = require('lodash')

const { expect } = require('../../utils/validator')

const Slack = require('../../models/Slack')
const Brand = require('../../models/Brand')
const Contact = require('../../models/Contact')
const Filter2 = require('../../models/Contact/filter2')

const {
  getMatchingIds,
  getCurrentBrand,
  _getFilterFromRequest,
  limitAccess,
} = require('./common')
const { workerize, registerWorker, workers } = require('./worker')

/**
 * @template TParams
 * @template TQuery
 * @template TBody
 * @typedef {import('../../../types/monkey/controller').IAuthenticatedRequest<TParams, TQuery, TBody>} IAuthenticatedRequest
 */
/** @typedef {import('../../../types/monkey/controller').IResponse} IResponse */

registerWorker(doUndelete)
registerWorker(doUpdateContacts)
registerWorker(doDeleteContacts)

async function fastFilter(req, res) {
  const filter_res = await getMatchingIds(req, { limit: 50 })
  const rows = await Contact.getAll(Array.from(filter_res.ids))

  if (rows.length === 0) {
    res.collection([])
  } else {
    // @ts-ignore
    rows[0].total = filter_res.total

    await res.collection(rows)
  }
}

async function mixedFilter(req, res) {
  const brand_id = getCurrentBrand()
  const { filter, query } = await _getFilterFromRequest(brand_id, req)

  const ids = query.ids || []
  await limitAccess('write', req.user.id, brand_id, ids)

  const filter_result = await Filter2.fastFilter(brand_id, filter, { limit: 50, ...query })
  let result = filter_result

  if (Array.isArray(ids) && ids.length > 0) {
    result = {
      ...filter_result,
      ids: _.uniq(ids.concat(filter_result.ids))
    }
  }
  const rows = await Contact.getAll(Array.from(result.ids))

  if (rows.length === 0) {
    res.collection([])
  } else {
    // @ts-ignore
    rows[0].total = result.total

    await res.collection(rows)
  }
}

async function addContacts(req, res) {
  if (!Array.isArray(req.body.contacts)) {
    throw Error.Validation('Contacts should be an array.')
  }

  if (req.body.hasOwnProperty('options')) {
    throw Error.BadRequest(
      'options is deprecated and will be removed. Please send options as query arguments.'
    )
  }

  /** @type {UUID} */
  const user_id = req.user.id

  /** @type {UUID} */
  const brand_id = getCurrentBrand()

  /** @type {IContact[]} */
  const contacts = req.body.contacts || []

  /** @type {IAddContactOptions} */
  const options = _(req.query)
    .pick(['get', 'activity', 'relax'])
    .transform((res, value, key) => {
      res[key] = value === 'true'
    }, {})
    .value()

  if (options.relax !== true) {
    for (let i = 0; i < contacts.length; i++) {
      const owner = contacts[i].user
      if (!owner || owner.length !== 36) {
        throw Error.Validation(`Contact #${i} doesn't have a "user" specified.`)
      }

      if (!Array.isArray(contacts[i].attributes)) {
        throw Error.Validation(`Contact #${i} doesn't have a required minimum of one attribute.`)
      }
    }
  }

  const owners = _.uniq(contacts.map((c) => c.user).filter((x) => x))

  for (const owner of owners) {
    await Brand.limitAccess({
      brand: brand_id,
      user: owner,
    })
  }

  try {
    const contact_ids = await Contact.create(contacts, user_id, brand_id, 'direct_request', options)

    if (options.get) {
      const contacts = await Contact.getAll(contact_ids)
      return res.collection(contacts)
    }

    const source_type = contacts[0].attributes.find((a) => a.attribute_type === 'source_type')
    if (source_type && source_type.text === 'ExplicitlyCreated') {
      const n_contacts = contact_ids.length > 0 ? 'a contact' : `${contact_ids.length} contacts`

      Slack.send({
        channel: '6-support',
        text: `${`<mailto:${req.user.email}|${req.user.display_name}>`} created ${n_contacts} manually`,
        emoji: ':busts_in_silhouette:',
      })
    }

    return res.collection(contact_ids)
  } catch (ex) {
    res.error(ex)
  }
}

async function doUndelete(req) {
  const brand_id = getCurrentBrand()
  const { filter, query } = await _getFilterFromRequest(brand_id, req)

  if (!query.deleted_gte && !query.deleted_lte) {
    throw Error.BadRequest('either deleted_gte or deleted_lte params must be present')
  }

  await Contact.undelete(brand_id, filter, query)
}

async function undelete(req, res) {
  const brand_id = getCurrentBrand()
  const { query } = await _getFilterFromRequest(brand_id, req)

  if (!query.deleted_gte && !query.deleted_lte) {
    return res.error(Error.BadRequest('either deleted_gte or deleted_lte params must be present'))
  }

  await workers.doUndelete({
    brand: getCurrentBrand(),
    user: req.user.id,
    params: req.params,
    query: req.query,
    body: req.body
  })

  res.status(204)
  res.end()
}

async function doUpdateContacts(req) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  let { ids: contact_ids } = await getMatchingIds(req)
  let contacts = []
  let owners = []

  if (req.body.contacts) {
    contacts = req.body.contacts
    expect(contacts).to.be.an('array')
    contact_ids = contacts.map((c) => c.id)
    await limitAccess('write', user_id, brand_id, contact_ids)

    owners = _.uniq(contacts.map((c) => c.user).filter((x) => x))
    for (const owner of owners) {
      await Brand.limitAccess({
        brand: brand_id,
        user: owner,
      })
    }
  } else {
    expect(req.body.patch).to.have.any.keys('parked', 'user')
    contacts = contact_ids.map((id) => ({
      id,
      user: req.body.patch.user,
      parked: req.body.patch.parked,
    }))
    if (req.body.patch.user) {
      await Brand.limitAccess({
        brand: brand_id,
        user: req.body.patch.user,
      })
    }
  }

  await Contact.update(contacts, user_id, brand_id, 'direct_request')
}

async function updateContacts(req, res) {
  await workerize(doUpdateContacts)(req)
  res.status(204)
  res.end()
}

async function doDeleteContacts(req) {
  const user = req.user.id
  const { ids } = await getMatchingIds(req)
  await Contact.delete(ids, user)
}

async function deleteContacts(req, res) {
  await workerize(doDeleteContacts)(req)
  res.status(204)
  res.end()
}

async function getContact(req, res) {
  const id = req.params.id
  expect(id).to.be.uuid

  const contact = await Contact.get(id)
  await res.model(contact)
}

async function deleteContact(req, res) {
  const id = req.params.id
  expect(id).to.be.uuid

  await Contact.delete([id], req.user.id)

  res.status(204)
  res.end()
}

async function updateContact(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  const id = req.params.id
  expect(id).to.be.uuid

  /* Ignore if the client wanna update the owner. We've got another endpoint
   * for this specific purpose. */
  delete req.body.user

  await Contact.update([{
    ...req.body,
    id,
  }], user_id, brand_id, 'direct_request')

  const contact = await Contact.get(id)
  await res.model(contact)
}

/**
 * @param {IAuthenticatedRequest<Pick<IContact, 'id'>, never, Pick<IContact, 'user'>>} req
 * @param {IResponse} res
 */
async function updateContactOwner (req, res) {
  const newOwnerId = req.body.user
  const contactId = req.params.id

  expect(newOwnerId).to.be.uuid
  expect(contactId).to.be.uuid

  const currBrandId = getCurrentBrand()
  const currUserId = req.user.id

  await Brand.limitAccess({
    brand: currBrandId,
    user: newOwnerId,
  })

  await Contact.update(
    [{ id: contactId, user: newOwnerId }],
    currUserId,
    currBrandId,
    'direct_request',
  )

  res.model(await Contact.get(contactId))
}

/**
 * @param {IAuthenticatedRequest<Pick<IContact, 'id'>, never, Pick<IContact, 'touch_freq'>>} req
 * @param {IResponse} res
 */
async function updateContactTouchFreq (req, res) {
  const brandId = getCurrentBrand()
  const contactId = req.params.id
  expect(contactId).to.be.uuid

  const contact = { id: contactId, touch_freq: req.body.touch_freq }
  await Contact.updateTouchFreq([contact], req.user.id, brandId)

  res.model(await Contact.get(contactId))
}

module.exports = {
  mixedFilter,
  fastFilter,
  addContacts,
  undelete,
  updateContacts,
  deleteContacts,
  getContact,
  updateContact,
  updateContactOwner,
  updateContactTouchFreq,
  deleteContact,
}
