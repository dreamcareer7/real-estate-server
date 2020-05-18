const squel = require('@rechat/squel').useFlavour('postgres')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const { expect } = require('../../utils/validator')

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
  join_condition.and(`(
    deals.brand IN(SELECT user_brands(?, NULL))
    OR dr.brand IN(
      SELECT user_brands(?, NULL)
    )
  )`, user.id, user.id)

  q.left_join('deals_roles', 'dr', join_condition)
  q.left_join('deals_checklists', 'dc', 'dr.checklist = dc.id')
}

const listingQuery = (term, query) => {
  const expr = squel.rstr('search_listings(to_tsquery(?))', tsquery(term))

  query.left_join(expr, 'sl', 'sl.id = deals.listing')
}

const contextQuery = (term, query, expr) => {
  query.left_join('current_deal_context', 'cdc', 'deals.id = cdc.deal')
  query.where('cdc.deleted_at IS NULL')

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

    const { text } = item
    if (!text)
      continue // For now only text filters are supported.

    expect(text).to.be.an('array')

    /*
     * A query like this:
     * listing_status: []
     * Is not really valid as there's no statuses sent.
     * Therefore ignore it. Otherwise it'll create the query ... IN ()
     * which is invalid.
     */
    if (text.length < 1)
      return

    const expr = squel.expr()
    expr.and('cdcf.key = ? AND cdcf.text IN ?', key, text)
    q.where(expr)
  }
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

Deal.filter = async ({filter, user}) => {
  const q = squel
    .select()
    .from('deals')
    .field('DISTINCT deals.id')
    .where(`deals.deleted_at      IS NULL
            AND dr.deleted_at     IS NULL
            AND dc.deactivated_at IS NULL
            AND dc.terminated_at  IS NULL`)

  accessFilter(q, user)
  brandFilter(q, filter)
  listingFilter(q, filter)
  queryFilter(q, filter)
  roleFilter(q, filter)
  contextFilter(q, filter)

  sort(q, filter)

  q.limit(300)

  const built = q.toParam()

  const res = await promisify(db.executeSql)(built.text, built.values)

  return promisify(Deal.getAll)(res.rows.map(r => r.id))
}
