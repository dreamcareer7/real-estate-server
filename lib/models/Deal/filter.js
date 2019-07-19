const squel = require('@rechat/squel').useFlavour('postgres')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const { expect } = require('../../utils/validator')

const primary_agent_query = `
  (
    deals.deal_type = 'Selling'
    AND dr.role = 'SellerAgent'
  )
  OR
  (
    deals.deal_type = 'Buying'
    AND dr.role = 'BuyerAgent'
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
  join_condition.and('(dr.brand IS NULL OR dr.brand IN(SELECT user_brands(?, NULL)))', user.id)

  q.left_join('deals_roles', 'dr', join_condition)

  const expr = squel.expr()
  expr.and('deals.brand IN (SELECT user_brands(?, NULL))', user.id)

  q.where(expr)
}

const listingQuery = (term, query) => {
  const expr = squel.rstr('search_listings(to_tsquery(?))', tsquery(term))

  query.left_join(expr, 'sl', 'sl.id = deals.listing')
}

const contextQuery = (term, query, expr) => {
  query.left_join('current_deal_context', 'cdc', 'deals.id = cdc.deal')

  const q = `cdc.searchable
             @@ to_tsquery('english', ?)`
  expr.or(q, tsquery(term))
}

const roleQuery = (term, query, expr) => {
  const e = squel.expr()

  e.and('dr.deleted_at IS NULL')

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

  query.where('dr.user IN ?', user)

  query.where(expr)
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
    .where('deals.deleted_at IS NULL AND dr.deleted_at IS NULL')

  accessFilter(q, user)
  brandFilter(q, filter)
  listingFilter(q, filter)
  queryFilter(q, filter)
  roleFilter(q, filter)

  sort(q, filter)

  q.limit(300)

  const built = q.toParam()

  const res = await promisify(db.executeSql)(built.text, built.values)

  return promisify(Deal.getAll)(res.rows.map(r => r.id))
}
