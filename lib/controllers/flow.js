const moment = require('moment-timezone')

const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')
const Brand = require('../models/Brand/index')
const Flow = {
  ...require('../models/Flow/get'),
  ...require('../models/Flow/filter'),
  ...require('../models/Flow/enroll'),
  ...require('../models/Flow/stop'),
}
const Contact = {
  ...require('../models/Contact/access'),
  ...require('../models/Contact/fast_filter')
}
const ContactList = require('../models/Contact/list')
const { TriggerError } = require('../models/Trigger/error')

/**
 * Contact access control function
 * @param {TAccessActions} action 
 * @param {UUID} user_id 
 * @param {UUID} brand_id 
 * @param {UUID[]} ids 
 */
async function contactLimitAccess(action, user_id, brand_id, ids) {
  for (const contact_id of ids) {
    expect(contact_id).to.be.uuid
  }

  await Brand.limitAccess({
    brand: brand_id,
    user: user_id
  })
  const accessIndex = await Contact.hasAccess(brand_id, user_id, action, ids)

  for (const contact_id of ids) {
    if (!accessIndex.get(contact_id)) {
      throw Error.ResourceNotFound(`Contact ${contact_id} not found`)
    }
  }
}

/**
 * @returns {UUID}
 */
function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

/**
 * @returns {Promise<{ ids: UUID[]; total: any; }>}
 */
async function getMatchingIds(contacts_query, user_id, default_args = {}) {
  const brand_id = getCurrentBrand()

  if (contacts_query.filter) {
    expect(contacts_query.filter).to.be.an('array')
  }

  if (contacts_query.filters) {
    expect(contacts_query.filters).to.be.an('array')
  }

  const body_args = contacts_query
  const filter = Array.isArray(contacts_query.filter) ? contacts_query.filter : (Array.isArray(contacts_query.filters) ? contacts_query.filters : [])

  /** @type {IContactFilterOptions} */
  const query = Object.assign({}, default_args, body_args)

  if (query.lists) {
    expect(query.lists).to.be.an('array')
    const accessMap = await ContactList.hasAccess(brand_id, 'read', query.lists)
    accessMap.forEach((hasAccess, list_id) => {
      if (!hasAccess) {
        throw Error.ResourceNotFound(`Contact list ${list_id} not found.`)
      }
    })
  }

  if (typeof contacts_query.query === 'string' && contacts_query.query.length > 0) {
    query.q = contacts_query.query.split(/\s+/)
  }

  for (const k of ['updated_gte', 'updated_lte']) {
    if (query.hasOwnProperty(k))
      query[k] = parseFloat(query[k])
  }

  /** @type {UUID[]} */
  const ids = query.ids || []
  expect(ids).to.be.a('array')
  await contactLimitAccess('write', user_id, brand_id, ids)

  console.log(JSON.stringify(filter, null, 2))
  const filter_result = await Contact.fastFilter(brand_id, filter, query)

  if (Array.isArray(ids) && ids.length > 0) {
    return {
      ...filter_result,
      ids: [... new Set(ids.concat(filter_result.ids))]
    }
  }

  return filter_result
}


/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{}, {}, IFlowEnrollInput>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function enroll(req, res) {
  const brand_id = getCurrentBrand()

  expect(req.body.origin).to.be.uuid
  expect(req.body.starts_at).to.be.a('number')
  expect(req.body.steps).to.be.an('array')
  expect(req.body.contacts).to.be.an('object')

  const starts_at = moment.unix(req.body.starts_at).tz(req.user.timezone).startOf('day').utc(true).unix()
  const { ids: contacts } = await getMatchingIds(req.body.contacts, req.user.id)

  try {
    const flows = await Flow.enrollContacts(
      brand_id,
      req.user.id,
      req.body.origin,
      starts_at,
      req.body.steps,
      contacts
    )
  
    res.collection(flows)
  } catch (ex) {
    if (ex instanceof TriggerError) {
      throw Error.BadRequest(ex)
    }
    throw ex
  }
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function stop(req, res) {
  await Flow.stop(req.user.id, req.params.id)

  res.status(204)
  res.end()
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{}, {}, {}>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function deleteAllBrandFlows(req, res) {
  const ids = await Flow.filter({ brand: getCurrentBrand() })

  for (const id of ids) {
    await Flow.stop(req.user.id, id)
  }

  res.status(204)
  res.end()
}

const _access = async (req, res, next) => {
  await Brand.limitAccess({
    user: req.user.id,
    brand: getCurrentBrand()
  })

  next()
}

/**
 * @param {import('../../types/monkey/controller').IRechatApp} app 
 */
const router = function (app) {
  const b = app.auth.bearer.middleware
  const access = am(_access)

  app.post('/crm/flows', b, access, am(enroll))
  app.delete('/crm/flows', b, access, am(deleteAllBrandFlows))
  app.delete('/crm/flows/:id', b, access, am(stop))
}

module.exports = router
