const _ = require('lodash')
const { expect } = require('../../utils/validator')

const Brand = require('../../models/Brand')
const Contact = require('../../models/Contact')
const ContactList = require('../../models/Contact/list')

/**
 * @returns {UUID}
 */
function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

/**
 * Access control function
 * @param {TAccessActions} action
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @param {UUID[]} ids
 */
async function limitAccess(action, user_id, brand_id, ids) {
  for (const contact_id of ids) {
    expect(contact_id).to.be.uuid
  }

  await Brand.limitAccess({
    brand: brand_id,
    user: user_id,
  })
  const accessIndex = await Contact.hasAccess(brand_id, action, ids)

  for (const contact_id of ids) {
    if (!accessIndex.get(contact_id)) {
      throw Error.ResourceNotFound(`Contact ${contact_id} not found`)
    }
  }
}

function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify((err) => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

function access(action) {
  return (req, res, next) => {
    const ids = Array.isArray(req.query.ids) ? req.query.ids : [req.params.id]

    limitAccess(action, req.user.id, getCurrentBrand(), ids).nodeify((err) => {
      if (err) {
        return res.error(err)
      }

      next()
    })
  }
}

function _prepareQueryForFilters(query) {
  if (!query) return

  for (const k of ['limit', 'start', 'updated_gte', 'updated_lte']) {
    if (query.hasOwnProperty(k)) query[k] = parseFloat(query[k])
  }

  if (query.hasOwnProperty('parked')) {
    if (query.parked === 'true' || query.parked === true) {
      query.parked = true
    } else if (query.parked === 'false' || query.parked === false) {
      query.parked = false
    } else {
      throw Error.Validation(`Invalid value for parked filter: ${query.parked}`)
    }
  }

  if (query.q && query.q.length === 0) {
    delete query.q
  }

  const sortable_fields = [
    'display_name',
    'sort_field',
    'last_touch',
    'next_touch',
    'created_at',
    'updated_at',
  ]

  if (query.q) {
    sortable_fields.push('rank')
    sortable_fields.push('last_touch_rank')
  }

  if (query.order && !sortable_fields.includes(query.order.replace(/^-/, ''))) {
    throw Error.Validation(`Sorting by ${query.order} not possible.`)
  }
}

async function _getFilterFromRequest(brand_id, req, default_args = {}) {
  let filter = []
  if (req.body.filter) {
    expect(req.body.filter).to.be.an('array')
    filter = req.body.filter
  } else if (req.body.filters) {
    expect(req.body.filters).to.be.an('array')
    filter = req.body.filters
  } else if (req.body.attributes) {
    expect(req.body.attributes).to.be.an('array')
    filter = req.body.attributes
  }

  const body_args = req.body

  /** @type {IContactFilterOptions} */
  const query = Object.assign({}, default_args, req.query, body_args)

  if (query.lists) {
    expect(query.lists).to.be.an('array')
    const accessMap = await ContactList.hasAccess(brand_id, 'read', query.lists)
    accessMap.forEach((hasAccess, list_id) => {
      if (!hasAccess) {
        throw Error.ResourceNotFound(`Contact list ${list_id} not found.`)
      }
    })
  }

  if (typeof req.body.query === 'string' && req.body.query.length > 0) {
    query.q = req.body.query.split(/\s+/)
  }

  _prepareQueryForFilters(query)

  /** @type {UUID[]} */
  const ids = query.ids || []
  expect(ids).to.be.a('array')

  return {
    query,
    filter
  }
}

const matchingIdsCache = new WeakMap()

/**
 * @param {(IContactFilterOptions & PaginationOptions)=} defaultQuery
 * @returns {Promise<{ ids: UUID[]; total: any; }>}
 */
async function getMatchingIds(req, defaultQuery) {
  if (matchingIdsCache.has(req)) {
    return matchingIdsCache.get(req)
  }

  const brand_id = getCurrentBrand()
  const { filter, query } = await _getFilterFromRequest(brand_id, req)

  const ids = query.ids || []
  await limitAccess('write', req.user.id, brand_id, ids)

  const filter_result = await Contact.fastFilter(brand_id, filter, { ...defaultQuery, ...query })
  let result = filter_result

  if (Array.isArray(ids) && ids.length > 0) {
    result = {
      ...filter_result,
      ids: _.uniq(ids.concat(filter_result.ids))
    }
  }

  matchingIdsCache.set(req, result)

  return result
}

module.exports = {
  getCurrentBrand,
  limitAccess,
  brandAccess,
  access,
  _prepareQueryForFilters,
  _getFilterFromRequest,
  getMatchingIds,
}
