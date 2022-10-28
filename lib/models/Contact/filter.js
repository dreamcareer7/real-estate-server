const keyBy = require('lodash/keyBy')
const db = require('../../utils/db.js')
const sq = require('../../utils/squel_extensions')
const { expect } = require('../../utils/validator')
// eslint-disable-next-line no-unused-vars
const squel = require('@rechat/squel')

const AttributeDef = require('./attribute_def/get')

/**
 * @param {TContactFilterOperator=} op
 */
function operatorMap(op) {
  switch (op) {
    case 'lte':
      return '<='
    case 'gte':
      return '>='
    case 'between':
      return 'BETWEEN'
    default:
      return '='
  }
}

/**
 * @param {TContactFilterOperator=} op
 * @param {any} value
 * @param {IContactAttributeDef} def
 */
function expressionMap(op, value, def) {
  const formatted_value = (def.data_type === 'date') ? 'to_timestamp(?)' : '?'

  switch (op) {
    case 'any':
      return `ANY(ARRAY[${value.map(_ => '?').join(', ')}]::${def.data_type}[])`
    case 'between':
      return formatted_value + ' AND ' + formatted_value
    default:
      return formatted_value
  }
}

/**
 * @param {*} f
 * @param {IContactAttributeDef} def
 * @returns
 */
function valueMap(f, def) {
  if (f.value === null || f.value === undefined) return null
  if (f.value instanceof Date) return f.value.getTime() / 1000
  if (def.name === 'tag') {
    if (Array.isArray(f.value)) {
      return sq.SqArray.from(f.value.map(x => x?.toLowerCase?.()))
    }

    return f.value?.toLowerCase?.()
  }
  if (Array.isArray(f.value)) return sq.SqArray.from(f.value)
  return f.value
}

function fieldMap(def) {
  if (def.name === 'tag') {
    return `LOWER(${def.data_type})`
  }

  return def.data_type
}

function nonSummarizedAttributeQuery(
  attribute_filters,
  defs_by_id,
  filter_type,
  contacts_table_alias = 'contacts'
) {
  const filters = attribute_filters.map((f, i) => {
    const def = defs_by_id[f.attribute_def]

    if (!def) {
      throw Error.Validation(`AttributeDef ${f.attribute_def} in filter #${i} does not exist.`)
    }

    return {
      attribute_def: def,
      field: fieldMap(def),
      operator: operatorMap(f.operator),
      expression: expressionMap(f.operator, f.value, def),
      value: valueMap(f, def),
      invert: f.invert,
    }
  })

  const sub_q_fn = (f) => {
    const def = f.attribute_def

    const sub_q = sq.select()
      .field('contact')
      .from('contacts_attributes')
      .where(`contact = ${contacts_table_alias}.id`)
      .where('data_type = ?', def.data_type)
      .where('deleted_at IS NULL')
      .where('attribute_def = ?', def.id)

    if (f.value !== null) {
      sub_q.where(`${f.field} ${f.operator} ${f.expression}`, f.value)
    }

    const s = (f.invert ? f.value === null : f.value !== null)
      ? 'EXISTS'
      : 'NOT EXISTS'
    return sq.rstr(`${s} (?)`, sub_q)
  }

  return filters.map(sub_q_fn).reduce((condition, expr) => {
    if (filter_type === 'or') return condition.or(expr)
    return condition.and(expr)
  }, sq.expr())
}

/**
 * Generate a squel query for complex filtering on attributes
 * @param {IContactAttributeFilter[]} attribute_filters Attribute filters
 * @param {UUID} brand_id
 * @param {'and' | 'or'} filter_type
 * @returns {Promise<squel.PostgresSelect?>}
 */
async function attributeFilterQuery(
  attribute_filters,
  brand_id,
  filter_type = 'and'
) {
  if (!Array.isArray(attribute_filters)) return null

  const def_ids_to_get = await AttributeDef.getForBrand(brand_id)
  const defs = await AttributeDef.getAll(def_ids_to_get)
  const defs_by_id = keyBy(defs, 'id')
  const defs_by_name = keyBy(defs, 'name')

  for (const f of attribute_filters) {
    if (f.attribute_type) {
      f.attribute_def = defs_by_name[f.attribute_type].id
    }
  }

  return nonSummarizedAttributeQuery(attribute_filters, defs_by_id, filter_type)
}

/**
 * Generate a squel query for complex filtering on contacts with attributes
 * @param {UUID} brand_id
 * @param {UUID | undefined | null} [user_id] the user ID which tries to access the filtered contacts. Will be used to find assigned contact (leads). Nil values means just ignore assigned contacts.
 * @param {IContactAttributeFilter[]} attribute_filters Attribute filters
 * @param {IContactFilterOptions & PaginationOptions | undefined} options
 * @returns {Promise<squel.Select>}
 */
async function contactFilterQuery(
  brand_id,
  user_id = null,
  attribute_filters = [],
  options = {}
) {
  expect(brand_id).to.be.uuid

  if (!options) options = {}
  const terms = options.q

  const q = sq
    .select({
      rawNesting: true
    })
    .field('id')
    .field('COUNT(*) OVER()::INT', 'total')
    .from('contacts')
    .where('parked = ?', options.parked || false)

  if (options.select?.length) {
    options.select.forEach(f => q.field(f))
  }

  if (!options.deleted_gte && !options.deleted_lte)
    q.where('deleted_at IS NULL')

  if (Array.isArray(terms)) {
    const query = terms
      .filter(t => t.length > 0)
      .map(term => `${term.replace(/([:&*!|'"()$\\])/g, '\\$1')}:*`).join(' & ')

    q.field(sq.rstr('ts_rank(search_field, to_tsquery(\'simple\', ?))', query), 'rank')
    q.where('search_field @@ to_tsquery(\'simple\', ?)', query)
  }

  const filter_expr = sq.expr()
  const op = options.filter_type === 'or' ? filter_expr.or.bind(filter_expr) : filter_expr.and.bind(filter_expr)

  if (options.list) {
    op('id = ANY(?)', sq.select()
      .field('contact')
      .from('crm_lists_members')
      .where('list = ?', options.list)
      .where('deleted_at IS NULL'))
  }
  else if (Array.isArray(options.lists) && options.lists.length > 0) {
    op('id = ANY(?)', sq.select()
      .field('contact')
      .from('crm_lists_members')
      .where('list = ANY(?)', sq.SqArray.from(options.lists))
      .where('deleted_at IS NULL'))
  }

  if (Array.isArray(options.flows && options.flows.length > 0)) {
    op(
      'id = ANY(?)',
      sq
        .select()
        .field('contact')
        .from('flows')
        .where('origin = ANY(?)', sq.SqArray.from(options.flows))
        .where('deleted_at IS NULL')
    )
  }

  if (Array.isArray(options.crm_tasks) && options.crm_tasks.length > 0) {
    if (options.filter_type === 'or') {
      op('id = ANY(?)', sq.select()
        .field('contact')
        .from('crm_associations')
        .where('crm_task = ANY(?)', sq.SqArray.from(options.crm_tasks))
      )
    }
    else {
      const sub_queries = options.crm_tasks.map(crm_task => sq.select()
        .field('contact')
        .from('crm_associations')
        .where('crm_task = ?', crm_task)
      ).reduce((q, sub_q) => {
        if (!q)
          return sub_q

        return q.intersect(sub_q)
      })

      op('id = ANY(?)', sub_queries)
    }
  }

  if (options.ids)
    q.where('id = ANY(?)', sq.SqArray.from(options.ids))

  /** expr to filter contacts accessible for the user. mutates `q` and `distinct`. */
  const matchCurrentUser = () => {
    const assignedContacts = sq.select()
      .from('contacts_roles', 'cr')
      .field('array_agg(cr.contact)', 'assigned_contacts')
      .where('cr.deleted_at IS NULL')
      .where('cr.brand = ?::uuid', brand_id)
      .where('cr.user = ?::uuid', user_id)
      .where('cr.role = ?::contact_role', 'assignee')

    // @ts-expect-error-next-line
    q.with('assigned_contacts', assignedContacts, { materialized: true })
    q.cross_join('assigned_contacts')
    q.distinct()

    return sq.expr()
      .or('contacts.brand = ?::uuid', brand_id)
      .or('contacts.id = ANY(assigned_contacts.assigned_contacts)')
  }

  /** expr to filter contacts owned by one of members of options.users */
  const matchUsers = () => sq.expr()
    .and('contacts.brand = ?::uuid', brand_id)
    .and('contacts.user = ANY(?::uuid[])', sq.SqArray.from(options.users ?? []))

  if (!Array.isArray(options.users)) {
    q.where(matchCurrentUser())
  } else if (user_id && options.users.includes(user_id)) {
    q.where(sq.expr().or(matchCurrentUser()).or(matchUsers()))
  } else {
    q.where(matchUsers())
  }

  if (attribute_filters && !Array.isArray(attribute_filters))
    console.warn('[Contact.filter] attribute_filters should be an array.')

  if (Array.isArray(attribute_filters) && attribute_filters.length > 0) {
    op(await attributeFilterQuery(attribute_filters, brand_id, options.filter_type))
  }

  if (typeof options.alphabet === 'string' && options.alphabet.length > 0)
    q.where('sort_field ILIKE ?', options.alphabet.replace(/%/g, '\\%') + '%')

  if (options.created_gte)
    op('created_at >= to_timestamp(?)', options.created_gte)

  if (options.created_lte)
    op('created_at <= to_timestamp(?)', options.created_lte)

  if (options.updated_gte)
    op('updated_at >= to_timestamp(?)', options.updated_gte)

  if (options.updated_lte)
    op('updated_at <= to_timestamp(?)', options.updated_lte)

  if (options.last_touch_gte)
    op('last_touch >= to_timestamp(?)', options.last_touch_gte)

  if (options.last_touch_lte)
    op('last_touch <= to_timestamp(?)', options.last_touch_lte)

  if (options.next_touch_gte)
    op('next_touch >= to_timestamp(?)', options.next_touch_gte)

  if (options.next_touch_lte)
    op('next_touch <= to_timestamp(?)', options.next_touch_lte)

  q.where(filter_expr)

  if (Array.isArray(terms)) {
    q.order('rank', false)
  } else if (options.order) {
    const desc = options.order[0] === '-'
    const field = ('+-'.indexOf(options.order[0]) > -1) ? options.order.substring(1) : options.order
    const expression = (['last_touch', 'next_touch'].includes(field)) ? `COALESCE(${field}, to_timestamp(0))` : field

    q.order(expression, !desc)

    /* if distinct is used for the query, we must select columns of `order by`
     * clause, too. */
    // @ts-expect-error-next-line
    if (sq.isDistinct(q) && !sq.isSelected(q, expression)) {
      q.field(expression, '_')
    }
  }

  if (options.start) q.offset(options.start)
  if (options.limit) q.limit(options.limit)

  return q
}


/**
 * Central filtering function for contacts. Every kind of filtering
 *  is possible here
 * @param {UUID | undefined} brand_id Brand id of the user who's requesting filter
 * @param {UUID | undefined | null} user_id
 * @param {IContactAttributeFilter[]} attribute_filters
 * @param {IContactFilterOptions & PaginationOptions | undefined} options
 */
async function filter(brand_id, user_id, attribute_filters = [], options = {}) {
  const q = await contactFilterQuery(brand_id, user_id, attribute_filters, options)
  // @ts-ignore
  q.name = 'contact/filter'

  let rows = await db.select(q)

  if (options.excludes?.length) {
    const excludedIds = new Set(options.excludes)
    rows = rows.filter(r => !excludedIds.has(r.id))
  }

  return {
    ids: rows.map(r => r.id),
    total: rows[0]?.total || 0,
    rows,
  }
}

module.exports = {
  nonSummarizedAttributeQuery,
  attributeFilterQuery,
  contactFilterQuery,
  filter,
}
