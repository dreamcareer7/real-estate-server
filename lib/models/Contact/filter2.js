const keyBy = require('lodash/keyBy')
const partition = require('lodash/partition')
const sq = require('../../utils/squel_extensions')
const db = require('../../utils/db')
const { expect } = require('../../utils/validator')

const AttributeDef = require('./attribute_def/get')
const { nonSummarizedAttributeQuery } = require('./filter')

const summarized_attributes = [
  'title',
  'first_name',
  'middle_name',
  'last_name',
  'marketing_name',
  'nickname',
  'email',
  'phone_number',
  'tag',
  'website',
  'company',
  'birthday',
  'profile_image_url',
  'cover_image_url',
  'job_title',
  'source_type',
  'source',
]

/**
 * @param {IContactAttributeFilter} f
 * @param {IContactAttributeDef} def
 */
function operatorMap(f, def) {
  /** @type {TContactFilterOperator=} */
  const op = f.operator

  switch (op) {
    case 'lte':
      return '<='
    case 'gte':
      return '>='
    case 'between':
      return 'BETWEEN'
    default:
      if (f.value === null) return 'IS'
      if (def.singular !== true) {
        if (op === 'any') return '&&'

        return '@>'
      }

      return '='
  }
}

function expressionMap(f, def) {
  const op = f.operator

  let formatted_value

  if (f.value === null) {
    formatted_value = 'NULL'
  } else if (def.data_type === 'date') {
    formatted_value = 'to_timestamp(?)'
  } else {
    formatted_value = '?'
  }

  switch (op) {
    case 'any':
      if (def.singular)
        return `ANY(?::${
          def.data_type
        }[])`

      return '?'
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
  if (f.value === null) return undefined
  if (def.name === 'tag') {
    if (Array.isArray(f.value)) {
      return sq.SqArray.from(f.value.map(x => x?.toLowerCase?.()))
    }

    return new sq.SqArray(f.value?.toLowerCase?.())
  }
  if (Array.isArray(f.value)) return sq.SqArray.from(f.value)
  if (!def.singular) return new sq.SqArray(f.value)
  return f.value
}

function summarizedAttributeQuery(attribute_filters, defs_by_id, filter_type) {
  const q = sq.expr()

  const filters = attribute_filters.map((f, i) => {
    /** @type {IContactAttributeDef | undefined} */
    const def = defs_by_id[f.attribute_def]

    if (!def) {
      throw Error.Validation(
        `AttributeDef ${f.attribute_def || f.attribute_type} in filter #${i} does not exist.`
      )
    }

    const field = def.name === 'tag' ? 'tag_searchable' : def.name

    return {
      attribute_def: def,
      field,
      operator: operatorMap(f, def),
      expression: expressionMap(f, def),
      value: valueMap(f, def),
      invert: f.invert
    }
  })

  if (filter_type === 'or') {
    const q_or = sq.expr()

    for (const f of filters) {
      const crit = `${f.field} ${f.operator} ${f.expression}`

      if (f.invert) {
        q_or.or(
          sq
            .expr()
            .or(`${f.field} IS NULL`)
            .or(`NOT (${crit})`, f.value)
        )
      } else {
        q_or.or(crit, f.value)
      }
    }

    q.and(q_or)
  } else {
    for (const f of filters) {
      const crit = `${f.field} ${f.operator} ${f.expression}`

      if (f.invert) {
        if (f.operator === 'IS' && f.expression === 'NULL') {
          q.and(`${f.field} IS NOT NULL`)
        } else {
          q.and(
            sq
              .expr()
              .or(`${f.field} IS NULL`)
              .or(`NOT (${crit})`, f.value)
          )
        }
      } else {
        q.and(crit, f.value)
      }
    }
  }

  return q
}

/**
 * Generate a squel query for complex filtering on attributes
 * @param {IContactAttributeFilter[]} attribute_filters Attribute filters
 * @param {UUID} brand_id
 * @param {'and' | 'or'} filter_type
 */
async function attributeFilterQuery(
  attribute_filters,
  brand_id,
  filter_type = 'and'
) {
  if (!Array.isArray(attribute_filters)) return null

  const def_ids_to_get = await AttributeDef.getForBrand(brand_id)
  const defs = await AttributeDef.getAll(def_ids_to_get)
  const summarized = defs.filter(
    def => summarized_attributes.includes(def.name)
  )
  const defs_by_id = keyBy(defs, 'id')
  const defs_by_name = keyBy(defs, 'name')

  for (const f of attribute_filters) {
    if (f.attribute_type) {
      f.attribute_def = defs_by_name[f.attribute_type].id
    }
  }

  const [ filters_summarized, filters_non_summarized ] = partition(
    attribute_filters,
    f => summarized.includes(defs_by_id[f.attribute_def])
  )

  const q = sq.expr()
  const op = filter_type === 'or' ? q.or.bind(q) : q.and.bind(q)

  if (filters_summarized.length > 0) {
    op(summarizedAttributeQuery(
      filters_summarized, defs_by_id, filter_type
    ))
  }
  if (filters_non_summarized.length > 0) {
    op('id = ANY(?)', nonSummarizedAttributeQuery(
      filters_non_summarized, defs_by_id, filter_type
    ))
  }

  return q
}

/**
 * Generate a squel query for complex filtering on contacts with attributes
 * @param {IBrand['id']} brand_id
 * @param {IUser['id'] | undefined | null} [user_id]
 * @param {IContactAttributeFilter[]} attribute_filters Attribute filters
 * @param {IContactFilterOptions & PaginationOptions | undefined} options
 * @returns {Promise<import('@rechat/squel').Select>}
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
    .select()
    .field('id')
    .from('contacts')

  if (options.select?.length) {
    options.select.forEach(f => q.field(f))
  }

  if (typeof options.parked === 'boolean') {
    q.where('parked = ?', options.parked)
  }

  if (!options.forUpdate && !options.skipTotal)
    q.field('COUNT(*) OVER()::INT', 'total')

  if (!options.deleted_gte && !options.deleted_lte)
    q.where('deleted_at IS NULL')

  if (Array.isArray(terms)) {
    const query = terms
      .filter(t => t.length > 0)
      .map(term => `${term.replace(/([:&*!|'"()$\\])/g, '\\$1')}:*`)
      .join(' & ')

    q.field(sq.rstr('ts_rank(search_field, to_tsquery(\'simple\', ?))', query), 'rank')
    q.field(sq.rstr('ts_rank(search_field, to_tsquery(\'simple\', ?)) / ( extract(epoch FROM CLOCK_TIMESTAMP() - COALESCE(last_touch, updated_at)) / 86400 )', query), 'last_touch_rank')
    q.where('search_field @@ to_tsquery(\'simple\', ?)', query)
  }

  const filter_expr = sq.expr()
  const op = options.filter_type === 'or' ? filter_expr.or.bind(filter_expr) : filter_expr.and.bind(filter_expr)

  if (options.list) {
    op(
      'id = ANY(?)',
      sq
        .select()
        .field('contact')
        .from('crm_lists_members')
        .where('list = ?', options.list)
        .where('deleted_at IS NULL')
    )
  } else if (Array.isArray(options.lists) && options.lists.length > 0) {
    op(
      'id = ANY(?)',
      sq
        .select()
        .field('contact')
        .from('crm_lists_members')
        .where('list = ANY(?)', sq.SqArray.from(options.lists))
        .where('deleted_at IS NULL')
    )
  }

  if (Array.isArray(options.flows) && options.flows.length > 0) {
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

  if (Array.isArray(options.showings) && options.showings.length > 0) {
    op(
      'id = ANY(?)',
      sq
        .select()
        .field('contact')
        .from('showings_appointments')
        .where('showing = ANY(?)', sq.SqArray.from(options.showings))
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
      ).reduce((expr, sub_q) => {
        if (!expr)
          return sub_q

        return expr.intersect(sub_q)
      })

      op('id = ANY(?)', sub_queries)
    }
  }

  if (Array.isArray(options.ids))
    q.where('id = ANY(?)', sq.SqArray.from(options.ids))

  /** @type {boolean} */
  let distinct = false

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

    distinct = true
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

  if (options.created_by) q.where('created_by = ?', options.created_by)

  if (options.updated_by) q.where('updated_by = ?', options.updated_by)

  if (options.created_for) q.where('created_for = ?::contact_action_reason', options.created_for)

  if (options.updated_for) q.where('updated_for = ?::contact_action_reason', options.updated_for)

  if (options.activities) {
    q.where('activity = ANY(?)', sq.SqArray.from(options.activities))
  }

  if (attribute_filters && !Array.isArray(attribute_filters))
    console.warn('[Contact.filter] attribute_filters should be an array.')

  if (Array.isArray(attribute_filters) && attribute_filters.length > 0) {
    const sub_q = await attributeFilterQuery(
      attribute_filters,
      brand_id,
      options.filter_type
    )

    if (sub_q) op(sub_q)
  }

  if (typeof options.alphabet === 'string' && options.alphabet.length > 0)
    q.where('sort_field ILIKE ?', options.alphabet.replace(/%/g, '\\%') + '%')

  if (options.deleted_gte)
    op('deleted_at >= to_timestamp(?)', options.deleted_gte)

  if (options.deleted_lte)
    op('deleted_at <= to_timestamp(?)', options.deleted_lte)

  if (options.deleted_for)
    op('deleted_for = ?::contact_action_reason', options.deleted_for)

  if (options.deleted_by)
    op('deleted_by = ?::uuid', options.deleted_by)

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

  if (options.order) {
    const desc = options.order[0] === '-'
    const field = ('+-'.indexOf(options.order[0]) > -1) ? options.order.substring(1) : options.order
    const expression = (['last_touch', 'next_touch'].includes(field)) ? `COALESCE(${field}, to_timestamp(0))` : field

    q.order(expression, !desc)

    /* if distinct is used for the query, we must select columns of `order by`
     * clause, too. */
    if (distinct) {
      q.field(expression, '_')
    }

    // if (Array.isArray(terms) && !['rank', 'last_touch_rank'].includes(field)) {
    //   q.order('last_touch_rank', false)
    // } else {
    //   q.order(expression, !desc)
    // }
  }


  if (options.start) q.offset(options.start)
  if (options.limit) q.limit(options.limit)

  if (options.forUpdate) q.locking('FOR UPDATE')

  return q
}

/**
 * Central filtering function for contacts. Every kind of filtering
 *  is possible here
 * @param {UUID | undefined} brand_id User id requesting filter
 * @param {UUID | undefined | null} [user_id] User id requesting filter
 * @param {IContactAttributeFilter[]} attribute_filters
 * @param {IContactFilterOptions & PaginationOptions | undefined} options
 */
async function fastFilter(brand_id, user_id = null, attribute_filters = [], options = {}) {
  const q = await contactFilterQuery(brand_id, user_id, attribute_filters, options)
  // @ts-ignore
  q.name = 'contact/fast_filter'

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
  contactFilterQuery,
  fastFilter,
}
