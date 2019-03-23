const _ = require('lodash')
const sq = require('../../utils/squel_extensions')
// eslint-disable-next-line no-unused-vars
const squel = require('@rechat/squel')

const AttributeDef = require('./attribute_def')

function operatorMap(f, def) {
  /** @type {TContactFilterOperator} */
  const op = f.operator

  switch (op) {
    case 'lte':
      return '<='
    case 'gte':
      return '>='
    case 'between':
      return 'BETWEEN'
    default:
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

  if (def.data_type === 'date') formatted_value = 'to_timestamp(?)'
  else if (def.singular !== true) formatted_value = '?'
  else formatted_value = '?'

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

function valueMap(f, def) {
  if (Array.isArray(f.value)) return sq.SqArray.from(f.value)
  if (!def.singular) return new sq.SqArray(f.value)
  return f.value
}

/**
 * Generate a squel query for complex filtering on attributes
 * @param {IContactAttributeFilter[]} attribute_filters Attribute filters
 * @param {UUID} brand_id
 * @param {'and' | 'or'} filter_type
 */
async function attributeFilterQuery(
  q,
  attribute_filters,
  brand_id,
  filter_type = 'and'
) {
  if (!Array.isArray(attribute_filters)) return null

  const def_ids_to_get = await AttributeDef.getForBrand(brand_id)
  const defs = await AttributeDef.getAll(def_ids_to_get)
  const defs_by_id = _.keyBy(defs, 'id')
  const defs_by_name = _.keyBy(defs, 'name')

  const filters = attribute_filters.map((f, i) => {
    /** @type {IContactAttributeDef | undefined} */
    let def

    if (f.attribute_def) def = defs_by_id[f.attribute_def]
    else if (f.attribute_type) def = defs_by_name[f.attribute_type]

    if (!def) {
      throw Error.Validation(
        `AttributeDef ${f.attribute_def || f.attribute_type} in filter #${i} does not exist.`
      )
    }

    return {
      attribute_def: def,
      field: def.name,
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

    q.where(q_or)
  } else {
    for (const f of filters) {
      const crit = `${f.field} ${f.operator} ${f.expression}`

      if (f.invert) {
        q.where(
          sq
            .expr()
            .or(`${f.field} IS NULL`)
            .or(`NOT (${crit})`, f.value)
        )
      } else {
        q.where(crit, f.value)
      }
    }
  }
}

/**
 * Generate a squel query for complex filtering on contacts with attributes
 * @param {IContactAttributeFilter[]} attribute_filters Attribute filters
 * @param {IContactFilterOptions & PaginationOptions | undefined} options
 * @returns {Promise<squel.Select>}
 */
async function contactFilterQuery(
  brand_id,
  attribute_filters = [],
  options = {}
) {
  if (!options) options = {}
  const terms = options.q

  const q = sq
    .select({
      rawNesting: true
    })
    .field('id')
    .field('COUNT(*) OVER()::INT', 'total')
    .from('contacts_summaries')

  if (Array.isArray(terms)) {
    const query = terms
      .filter(t => t.length > 0)
      .map(term => `${term.replace(/([:&*!|'"$\\])/, '\\$1')}:*`).join(' & ')

    q.field(sq.rstr('ts_rank(search_field, to_tsquery(\'simple\', ?))', query), 'rank')
    q.where('search_field @@ to_tsquery(\'simple\', ?)', query)
  }

  if (options.list) {
    q.where(
      'id = ANY(?)',
      sq
        .select()
        .field('contact')
        .from('crm_lists_members')
        .where('list = ?', options.list)
        .where('deleted_at IS NULL')
    )
  } else if (Array.isArray(options.lists)) {
    q.where(
      'id = ANY(?)',
      sq
        .select()
        .field('contact')
        .from('crm_lists_members')
        .where('list = ANY(?)', sq.SqArray.from(options.list))
        .where('deleted_at IS NULL')
    )
  }

  if (Array.isArray(options.crm_task)) {
    if (options.filter_type === 'or') {
      q.where('id = ANY(?)', sq.select()
        .field('contact')
        .from('crm_associations')
        .where('crm_task = ANY(?)', sq.SqArray.from(options.crm_task))
      )
    }
    else {
      const sub_queries = options.crm_task.map(crm_task => sq.select()
        .field('contact')
        .from('crm_associations')
        .where('crm_task = ?', crm_task)
      ).reduce((q, sub_q) => {
        if (!q)
          return sub_q

        return q.intersect(sub_q)
      })

      q.where('id = ANY(?)', sub_queries)
    }
  }

  if (options.ids) q.where('id = ANY(?)', [`{${options.ids.join(',')}}`])

  if (attribute_filters && !Array.isArray(attribute_filters))
    console.warn('[Contact.filter] attribute_filters should be an array.')

  if (options.users)
    q.where('"user" = ANY(?)', [`{${options.users.join(',')}}`])

  if (options.created_by) q.where('created_by = ?', options.created_by)

  if (options.updated_by) q.where('updated_by = ?', options.updated_by)

  if (brand_id) q.where('brand = ?', brand_id)

  if (Array.isArray(attribute_filters) && attribute_filters.length > 0) {
    await attributeFilterQuery(
      q,
      attribute_filters,
      brand_id,
      options.filter_type
    )
  }

  if (typeof options.alphabet === 'string' && options.alphabet.length > 0)
    q.where('sort_field ILIKE ?', options.alphabet.replace(/%/g, '\\%') + '%')

  if (options.created_gte)
    q.where('created_at >= to_timestamp(?)', options.created_gte)

  if (options.created_lte)
    q.where('created_at <= to_timestamp(?)', options.created_lte)

  if (options.updated_gte)
    q.where('updated_at >= to_timestamp(?)', options.updated_gte)

  if (options.updated_lte)
    q.where('updated_at <= to_timestamp(?)', options.updated_lte)

  if (options.last_touch_gte)
    q.where('last_touch >= to_timestamp(?)', options.last_touch_gte)

  if (options.last_touch_lte)
    q.where('last_touch <= to_timestamp(?)', options.last_touch_lte)

  if (options.next_touch_gte)
    q.where('next_touch >= to_timestamp(?)', options.next_touch_gte)

  if (options.next_touch_lte)
    q.where('next_touch <= to_timestamp(?)', options.next_touch_lte)

  if (Array.isArray(terms)) {
    q.order('rank', false)
  }

  if (options.order) {
    const desc = options.order[0] === '-'
    const field = ('+-'.indexOf(options.order[0]) > -1) ? options.order.substring(1) : options.order
    const expression = (['last_touch', 'next_touch'].includes(field)) ? `COALESCE(${field}, to_timestamp(0))` : field

    q.order(expression, !desc)
  }

  if (options.start) q.offset(options.start)
  if (options.limit) q.limit(options.limit)

  return q
}

module.exports = contactFilterQuery
