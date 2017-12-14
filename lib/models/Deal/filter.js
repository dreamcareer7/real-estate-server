const squel = require('squel').useFlavour('postgres')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
// const Contexts = require('./context')

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
  q.where(`to_tsvector('english', text)
           @@ plainto_tsquery('english', ?)`, query)

  expr.or(`id IN (${q.toString()})`)
}

const roleQuery = (query, expr) => {
  const roles = squel.select().from('deals_roles').field('deal')
  roles.where(`to_tsvector('english',
               COALESCE(legal_prefix, '')      || ' ' ||
               COALESCE(legal_first_name, '')  || ' ' ||
               COALESCE(legal_middle_name, '') || ' ' ||
               COALESCE(legal_last_name, '')   || ' ' ||
               COALESCE(company_title, '')
              )
              @@ plainto_tsquery('english', ?)`, query)

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

const filters = {}

filters.Date = (q, key, criteria) => {
  q.and('key = ?', key)

  if (criteria.from)
    q.and('date >= ?', criteria.from)

  if (criteria.to)
    q.and('date <= ?', criteria.to)
}

filters.Number = (q, key, criteria) => {
  q.and('key = ?', key)

  if (criteria.less_than)
    q.and('number < ?', criteria.less_than)

  if (criteria.less_than_or_equals)
    q.and('number <= ?', criteria.less_than_or_equals)

  if (criteria.equals)
    q.and('number = ?', criteria.equals)

  if (criteria.not_equals)
    q.and('number <> ?', criteria.not_equals)

  if (criteria.is_not_null)
    q.and('number IS NOT NULL')
}

filters.Text = (q, key, criteria) => {
  q.and('key = ?', key)

  if (criteria.contains)
    q.and(`to_tsvector('english', text)
           @@ plainto_tsquery('english', ?)`, criteria.contains)

  if (criteria.equals)
    q.and('text = ?', criteria.equals)
}

// const addContextFilter = (q, key, criteria) => {
//   const definition = Contexts[key]
//   if (!definition)
//     throw new Error.Validation(`No such context ${key}`)
//
//   const c = squel.expr()
//
//   q.or(c)
//
//   filters[definition.type](c, key, criteria)
// }

Deal.filter = async ({filter, user}) => {
  const q = squel.select().from('deals').field('id')

  accessFilter(q, user)
  brandFilter(q, filter)
  queryFilter(q, filter)

  //   const cq = squel.select()
  //     .from('deal_context()')
  //     .field('deal')
  //     .group('deal')
  //
  //   let count = 0
  //
  //   const expr = squel.expr()
  //
  //   const { context = {} } = filter
  //
  //   for(const key in context) {
  //     addContextFilter(expr, key, context[key])
  //     count++
  //   }

  //   cq.having('count(*) = ?', count)

  //   cq.where(expr)

  //   q.where('id IN (?)', cq)

  const res = await promisify(db.executeSql)(q.toString(), [])

  return promisify(Deal.getAll)(res.rows.map(r => r.id))
}
