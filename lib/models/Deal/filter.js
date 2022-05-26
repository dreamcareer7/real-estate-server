const squel = require('@rechat/squel').useFlavour('postgres')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const { expect } = require('../../utils/validator')
const { getAll } = require('./get')
const Context = require('../Context')
const { isBoolean } = require('lodash')

const primary_agent_query = `
  (
    deals.deal_type = 'Selling'
    AND drr.role = 'SellerAgent'
  )
  OR
  (
    deals.deal_type = 'Buying'
    AND drr.role = 'BuyerAgent'
  )
`

const tsquery = q => {
  if (typeof q !== 'string')
    return

  return q
    .replace(/,|:|\*|\|/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(term => `${term}:*`)
    .join(' & ')
}

const brandFilter = (q, filter) => {
  if (!filter.brand)
    return

  const expr = squel.expr()
  expr.and(`deals.brand IN (SELECT brand_children(?))
            OR acl.brand IN(SELECT brand_children(?))`, filter.brand, filter.brand)

  q.where(expr)
}

const listingFilter = (q, filter) => {
  if (!filter.listing)
    return

  q.where('deals.listing = ?', filter.listing)
}

const accessFilter = (q, user) => {
  const join = squel.rstr('deals_acl(?::uuid)', user.id)
  q.left_join(join, 'acl', 'deals.id = acl.deal')
}

const listingQuery = (term, query) => {
  const expr = squel.rstr('search_listings(to_tsquery(?))', tsquery(term))

  query.left_join(expr, 'sl', 'sl.id = deals.listing')
}

const contextQuery = (term, query, expr) => {

  /*
   * This used to be based on a join.
   * But turning it into a subquery made it several orders of magnitude faster
   */

  expr.or(`deals.id IN(SELECT deal FROM current_deal_context cdc WHERE cdc.deleted_at IS NULL AND
    cdc.searchable @@ to_tsquery('english', ?))`, tsquery(term))
}

const roleQuery = (term, query, expr) => {
  query.left_join('deals_roles', 'dr', 'deals.id = dr.deal')

  const e = squel.expr()
  const q = `dr.searchable
             @@ to_tsquery('english', ?)`

  e.and(q, tsquery(term))

  expr.or(e)
}

const queryFilter = (q, filter) => {
  if (!filter.query)
    return

  const expr = squel.expr()

  listingQuery(filter.query, q, expr)
  contextQuery(filter.query, q, expr)
  roleQuery(filter.query, q, expr)

  q.where(expr)
}

const roleFilter = (query, filter) => {

  const { role } = filter

  if (!role)
    return

  const { user, is_primary_agent } = role

  expect(user).to.be.an('array')

  const expr = squel.expr()

  if (is_primary_agent)
    expr.and(primary_agent_query)

  expr.and('drr.user IN ?', user)
  expr.and('dcc.deactivated_at IS NULL')
  expr.and('dcc.terminated_at  IS NULL')

  query.join('deals_roles', 'drr', 'deals.id = drr.deal AND drr.deleted_at IS NULL')
  query.left_join('deals_checklists', 'dcc', 'drr.checklist = dcc.id')
  query.where(expr)

  /*
   * As you can see we already have a join on deals_role as dr
   * But here we make another join on deals_roles as drr
   *
   * The reason is, we want to say:
   * Filter out those deals which he has no access to (using dr)
   *
   * But among those, also filter out the ones with a matching role.
   *
   * If we reuse dr for this part of query, then it'd apply both conditions
   * to all deals.
   *
   * But we want the conditions to be applied separately.
   *
   * Imagine a deal having 2 roles:
   * BuyerAgent A John Smith
   * Buyer      B Alice Mannings
   *
   * If the query says: Filter out deals belonging to John Smith
   * that match the string `Alice`, then the query would fail
   * if we reuse dr condition for both as we don't have a role that
   * both belongs to John Smith and also matches `Alice`.
   *
   * So we need to join them separately so we can filter them separately.
   */
}

const contextFilter = (q, filter) => {
  const { contexts } = filter

  if (!contexts)
    return

  let i = 0
  for(const key in contexts) {
    const item = contexts[key]

    const name = `cdcf_${i++}`

    q.left_join('current_deal_context', name, `deals.id = ${name}.deal`)
    q.where(`${name}.deleted_at IS NULL`)

    const { text, date } = item

    if (text) {
      expect(text).to.be.an('array')

      const expr = squel.expr()
      expr.and(`${name}.key = ? AND ${name}.text IN ?`, key, text)
      q.where(expr)
    }

    if (date) {
      expect(date).to.be.an('object')
      
      const expr = squel.expr()

      if (date.from)
        expr.and(`${name}.key = ? AND ${name}.date >= ? AND ${name}.data_type = 'Date'`, key, date.from)

      if (date.to)
        expr.and(`${name}.key = ? AND ${name}.date <= ? AND ${name}.data_type = 'Date'`, key, date.to)

      q.where(expr)
    }
  }
}

const dealFilter = (q, filter) => {
  const { deal_type, is_draft, created_by, property_type } = filter

  if (deal_type && deal_type.length > 0)
    q.where('deals.deal_type IN ?', deal_type)

  if (is_draft === true)
    q.where('deals.faired_at IS NULL')

  if (is_draft === false)
    q.where('deals.faired_at IS NOT NULL')

  if (created_by)
    q.where('deals.created_by = ?', created_by)

  if (property_type && property_type.length > 0)
    q.where('deals.property_type IN ?', property_type)
}

const statusFilter = (q, filter) => {
  const { status } = filter

  if (!status)
    return

  const { is_active, is_pending, is_closed, is_archived, is_null } = status

  const expr = squel.expr()

  q.left_join('deal_statuses', null, 'deals.id = deal_statuses.deal')

  if (isBoolean(is_active))
    expr.or('deal_statuses.is_active = ?', is_active)

  if (isBoolean(is_pending))
    expr.or('deal_statuses.is_pending = ?', is_pending)

  if (isBoolean(is_closed))
    expr.or('deal_statuses.is_closed = ?', is_closed)

  if (isBoolean(is_archived))
    expr.or('deal_statuses.is_archived = ?', is_archived)

  if (is_null === true)
    expr.or('deal_statuses.deal IS NULL')

  if (is_null === false)
    expr.or('deal_statuses.deal IS NOT NULL')

  q.where(expr)
}

const sort = (query, filter) => {
  const { $order } = filter
  if (!$order)
    return

  const [ field, direction ] = $order

  const ascending = direction === 'ASC'

  query.field(field)
  query.order(field, ascending)
}

const filter = async ({filter, user}) => {
  const q = squel
    .select()
    .from('deals')
    .field('DISTINCT deals.id')
    .field('COUNT(*) OVER()::INT', 'total')
    .where('deals.deleted_at IS NULL')

  accessFilter(q, user)
  brandFilter(q, filter)
  listingFilter(q, filter)
  queryFilter(q, filter)
  roleFilter(q, filter)
  contextFilter(q, filter)
  dealFilter(q, filter)
  statusFilter(q, filter)

  sort(q, filter)

  q.limit(filter.limit || 300)

  filter.start && q.offset(filter.start)

  const built = q.toParam()

  Context.log(q.toString())

  const res = await promisify(db.executeSql)(built.text, built.values)

  const all = await promisify(getAll)(res.rows.map(r => r.id))
  const [ first ] = all

  if (first) first.total = res.rows[0].total

  return all
}

module.exports = {
  filter
}
