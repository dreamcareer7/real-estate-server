const squel = require('squel').useFlavour('postgres')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')

const brandFilter = (q, filter) => {
  if (!filter.brand)
    return

  const expr = squel.expr()
  expr.and('brand IN (SELECT brand_children(?))', filter.brand)

  q.where(expr)
}

const accessFilter = (q, user) => {
  const expr = squel.expr()
  expr.and('brand IN (SELECT user_brands(?))', user.id)

  q.where(expr)
}

const listingQuery = (query, expr) => {
  expr.or('listing IN (SELECT id FROM search_listings(?))', query)
}

const contextQuery = (query, expr) => {
  const q = squel.select().from('deal_context').field('DISTINCT deal')
  q.where(`to_tsvector('english', value)
           @@ plainto_tsquery('english', ?)`, query)

  expr.or(`id IN (${q.toString()})`)
}

const roleQuery = (query, expr) => {
  const users = squel.select().from('users').field('id')
  users.where(`to_tsvector('english', first_name || ' ' || last_name || ' ' || email)
               @@ plainto_tsquery('english', ?)`, query)

  const roles = squel.select().from('deals_roles').field('deal')

  roles.where(`"user" IN (${users.toString()})`)

  expr.or(`id IN (${roles.toString()})`)
}

const queryFilter = (q, filter) => {
  if (!filter.query)
    return

  const expr = squel.expr()

  listingQuery(filter.query, expr)
  contextQuery(filter.query, expr)
  roleQuery(filter.query, expr)

  q.where(expr)
}

Deal.filter = async ({filter, user}) => {
  const q = squel.select().from('deals').field('id')

  accessFilter(q, user)
  brandFilter(q, filter)
  queryFilter(q, filter)

  const res = await promisify(db.executeSql)(q.toString(), [])

  return promisify(Deal.getAll)(res.rows.map(r => r.id))
}
