const squel = require('@rechat/squel').useFlavour('postgres')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const { expect } = require('../../utils/validator')
const { getAll } = require('./get')

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

const status_query = `
  (
    WITH statuses AS (
      SELECT text, key FROM current_deal_context sdc  -- Status Deal Context.
      WHERE sdc.deal = deals.id
      AND   sdc.deleted_at IS NULL
      AND (sdc.key = 'contract_status' OR sdc.key = 'listing_status')
      ORDER BY sdc.key = 'contract_status' DESC, sdc.created_at DESC
      LIMIT 1
    )
    SELECT (
           (?::boolean = is_active   OR ?::boolean is NULL)
      AND  (?::boolean = is_pending  OR ?::boolean is NULL)
      AND  (?::boolean = is_archived OR ?::boolean IS NULL)
    ) FROM brands_deal_statuses
      WHERE brand IN (SELECT brand_parents(deals.brand))
      AND deleted_at IS NULL
      AND label = (
          SELECT text
          FROM statuses
          ORDER BY key = 'contract_status' ASC
          LIMIT 1
      ) LIMIT 1
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
            OR dr.brand IN(SELECT brand_children(?))`, filter.brand, filter.brand)

  q.where(expr)
}

const listingFilter = (q, filter) => {
  if (!filter.listing)
    return

  q.where('deals.listing = ?', filter.listing)
}

const accessFilter = (q, user) => {
  const join_condition = squel.expr()
  join_condition.and('deals.id = dr.deal')
  join_condition.and('dr.deleted_at IS NULL')
  join_condition.and(`(
    deals.brand IN(SELECT user_brands(?, NULL))
    OR (
        dr.brand IN(SELECT user_brands(?, NULL))
        AND (
          (
            deals.deal_type = 'Selling' AND
            NOT (dr.role IN('BuyerAgent', 'CoBuyerAgent'))
          )
          OR
          (
            deals.deal_type = 'Buying'  AND
            NOT (dr.role IN ('SellerAgent'::deal_role, 'CoSellerAgent'::deal_role))
          )
        )
      )
    )`, user.id, user.id)

  q.left_join('deals_roles', 'dr', join_condition)
  q.left_join('deals_checklists', 'dc', 'dr.checklist = dc.id AND dc.deactivated_at IS NULL AND dc.terminated_at  IS NULL')
}

const listingQuery = (term, query) => {
  const expr = squel.rstr('search_listings(to_tsquery(?))', tsquery(term))

  query.left_join(expr, 'sl', 'sl.id = deals.listing')
}

const contextQuery = (term, query, expr) => {
  query.left_join('current_deal_context', 'cdc', 'deals.id = cdc.deal AND cdc.deleted_at IS NULL')

  const q = `cdc.searchable
             @@ to_tsquery('english', ?)`
  expr.or(q, tsquery(term))
}

const roleQuery = (term, query, expr) => {
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

  q.left_join('current_deal_context', 'cdcf', 'deals.id = cdcf.deal')
  q.where('cdcf.deleted_at IS NULL')

  for(const key in contexts) {
    const item = contexts[key]

    const { text, date } = item

    if (text) {
      expect(text).to.be.an('array')

      const expr = squel.expr()
      expr.and('cdcf.key = ? AND cdcf.text IN ?', key, text)
      q.where(expr)
    }

    if (date) {
      expect(date).to.be.an('object')
      
      const expr = squel.expr()

      if (date.from)
        expr.and('cdcf.key = ? AND cdcf.date >= ?', key, date.from)

      if (date.to)
        expr.and('cdcf.key = ? AND cdcf.date <= ?', key, date.to)

      q.where(expr)
    }
  }
}

const dealFilter = (q, filter) => {
  const { deal_type, is_draft, created_by } = filter

  if (deal_type)
    q.where('deals.deal_type IN ?', deal_type)

  if (is_draft === true)
    q.where('deals.faired_at IS NULL')

  if (is_draft === false)
    q.where('deals.faired_at IS NOT NULL')

  if (created_by)
    q.where('deals.created_by = ?', created_by)
}

const statusFilter = (q, filter) => {
  const { status } = filter

  if (!status)
    return

  const active = status.is_active || null
  const pending = status.is_pending || null
  const archived = status.is_pending || null

  q.where(status_query, active, active, pending, pending, archived, archived)
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

  const res = await promisify(db.executeSql)(built.text, built.values)

  const all = await promisify(getAll)(res.rows.map(r => r.id))
  const [ first ] = all

  if (first) first.total = res.rows[0].total

  return all
}

module.exports = {
  filter
}
