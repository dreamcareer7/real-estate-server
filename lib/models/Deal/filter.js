const squel = require('@rechat/squel').useFlavour('postgres')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const { expect } = require('../../utils/validator')

const primary_agent_query = `
  (
    deals.deal_type = 'Selling'
    AND deals_roles.role = 'SellerAgent'
  )
  OR
  (
    deals.deal_type = 'Buying'
    AND deals_roles.role = 'BuyerAgent'
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
  expr.and('deals.brand IN (SELECT brand_children(?))', filter.brand)

  q.where(expr)
}

const listingFilter = (q, filter) => {
  if (!filter.brand)
    return

  const expr = squel.expr()
  expr.and('deals.listing = ?', filter.listing)

  q.where(expr)
}

const accessFilter = (q, user) => {
  const expr = squel.expr()
  expr.and('deals.brand IN (SELECT user_brands(?, NULL))', user.id)

  q.where(expr)
}

const listingQuery = (term, query, expr) => {
  expr.or('deals.listing IN (SELECT id FROM search_listings(to_tsquery(?)))', tsquery(term))
}

const contextQuery = (term, query, expr) => {
  query.left_join('current_deal_context', 'cdc', 'deals.id = cdc.deal')

  const q = `to_tsvector('english', cdc.text)
    @@ to_tsquery('english', ?)`
  expr.or(q, tsquery(term))
}

const roleQuery = (term, query, expr) => {
  const e = squel.expr()

  query.left_join('deals_roles', 'dr', 'deals.id = dr.deal')

  e.and('dr.deleted_at IS NULL')

  const q = `
    to_tsvector('english',
      COALESCE(dr.legal_prefix, '')      || ' ' ||
      COALESCE(dr.legal_first_name, '')  || ' ' ||
      COALESCE(dr.legal_middle_name, '') || ' ' ||
      COALESCE(dr.legal_last_name, '')   || ' ' ||
      COALESCE(dr.company_title, '')
    )
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


  query.join('deals_roles', null, 'deals.id = deals_roles.deal')

  query.where('deals_roles.user IN ?', user)
  query.where('deals_roles.deleted_at IS NULL')

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
  const q = squel.select().from('deals').field('DISTINCT deals.id').where('deals.deleted_at IS NULL')

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
