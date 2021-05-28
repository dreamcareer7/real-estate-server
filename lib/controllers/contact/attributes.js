const _ = require('lodash')

const { expect } = require('../../utils/validator')

const AttachedFile = require('../../models/AttachedFile')
const Contact = require('../../models/Contact')
const ContactAttribute = require('../../models/Contact/attribute')

const { getCurrentBrand, getMatchingIds, limitAccess } = require('./common')
const { registerWorker, workerize } = require('./worker')

registerWorker(doUpdateContactTags)

async function doUpdateContactTags(req) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  expect(req.body.tags).to.be.an('array')

  const { ids } = await getMatchingIds(req)

  await Contact.updateTags(ids, req.body.tags, user_id, brand_id, Array.isArray(req.body.ids))
}

/**
 * @param {import('../../../types/monkey/controller').IAuthenticatedRequest<{}, {}, IContactFilterOptions & { attributes?: IContactAttributeFilter[]; tags: string[]; }>} req
 * @param {import('../../../types/monkey/controller').IResponse} res
 */
async function updateContactTags(req, res) {
  expect(req.body.tags).to.be.an('array')

  await workerize(doUpdateContactTags)(req)

  res.status(204)
  res.end()
}

async function bulkAddAttributes(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  expect(req.body.attributes).to.be.an('array')

  const { ids } = await getMatchingIds(req)

  const contacts = []

  for (let i = 0; i < ids.length; i++) {
    contacts[i] = {
      id: ids[i],
      attributes: req.body.attributes,
    }
  }

  const affected_contacts_ids = await Contact.update(contacts, user_id, brand_id, 'direct_request')

  if (req.query.get === 'true') {
    const affected_contacts = await Contact.getAll(affected_contacts_ids, user_id)
    res.collection(affected_contacts)
  } else {
    res.status(204)
    res.end()
  }
}

async function deleteAttributes(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const ids = req.body.ids
  const attrs = await ContactAttribute.getAll(ids)

  if (attrs.length < ids.length) {
    throw Error.ResourceNotFound('Some or all of the provided attribute ids do not exist.')
  }

  const contact_ids = _.uniq(attrs.map(a => a.contact))  
  await limitAccess('write', user_id, brand_id, contact_ids)

  await ContactAttribute.delete(ids, user_id)

  res.status(204)
  res.end()
}

async function addAttributes(req, res) {
  const user_id = req.user.id
  const contact_id = req.params.id
  expect(contact_id).to.be.uuid

  /** @type {IContactAttribute[]} */
  const attributes = req.body.attributes
  try {
    expect(attributes).to.be.an('array')
  }
  catch (ex) {
    throw Error.Validation('Expected attributes to be an array.')
  }

  const added_ids = await Contact.addAttributes(contact_id, attributes, user_id, getCurrentBrand(), 'direct_request')

  const added = await ContactAttribute.getAll(added_ids)
  res.collection(added)
}

async function updateAttribute(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const contact_id = req.params.id
  const attribute_id = req.params.attribute_id

  expect(contact_id).to.be.uuid
  expect(attribute_id).to.be.uuid

  await Contact.update([{
    id: contact_id,
    attributes: [{
      ...req.body,
      id: attribute_id
    }]
  }], user_id, brand_id, 'direct_request')

  const updated = await ContactAttribute.get(attribute_id)
  res.model(updated)
}

async function deleteAttribute(req, res) {
  const user_id = req.user.id
  const contact_id = req.params.id
  const attribute_id = req.params.attribute_id

  expect(contact_id).to.be.uuid
  expect(attribute_id).to.be.uuid

  const affected_rows = await ContactAttribute.deleteForContact(contact_id, attribute_id, user_id)
  if (affected_rows !== 1) {
    throw Error.ResourceNotFound(`Attribute with id ${attribute_id} not found.`)
  }

  const contact = await Contact.get(contact_id)
  await res.model(contact)
}

function attach(req, res) {
  AttachedFile.saveFromRequest({
    path: req.params.id,
    req,
    relations: [{
      role: 'Contact',
      role_id: req.params.id
    }],
    public: true
  }, (err, { file } = {}) => {
    if (err)
      res.error(err)

    res.model(file)
  })
}

module.exports = {
  bulkAddAttributes,
  deleteAttributes,
  updateContactTags,
  addAttributes,
  updateAttribute,
  deleteAttribute,
  attach,
}
