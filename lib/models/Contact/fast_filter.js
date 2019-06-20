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
  attribute_filters,
  brand_id,
  filter_type = 'and'
) {
  if (!Array.isArray(attribute_filters)) return null

  const def_ids_to_get = await AttributeDef.getForBrand(brand_id)
  const defs = await AttributeDef.getAll(def_ids_to_get)
  const defs_by_id = _.keyBy(defs, 'id')
  const defs_by_name = _.keyBy(defs, 'name')

  const q = sq.expr()

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

    q.and(q_or)
  } else {
    for (const f of filters) {
      const crit = `${f.field} ${f.operator} ${f.expression}`

      if (f.invert) {
        q.and(
          sq
            .expr()
            .or(`${f.field} IS NULL`)
            .or(`NOT (${crit})`, f.value)
        )
      } else {
        q.and(crit, f.value)
      }
    }
  }

  return q
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
    .from('contacts')
    .where('deleted_at IS NULL')

  if (Array.isArray(terms)) {
    const query = terms
      .filter(t => t.length > 0)
      .map(term => `${term.replace(/([:&*!|'"()$\\])/g, '\\$1')}:*`)
      .join(' & ')

    q.field(sq.rstr('ts_rank(search_field, to_tsquery(\'simple\', ?))', query), 'rank')
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

  if (Array.isArray(options.users))
    q.where('"user" = ANY(?)', sq.SqArray.from(options.users))

  if (options.created_by) q.where('created_by = ?', options.created_by)

  if (options.updated_by) q.where('updated_by = ?', options.updated_by)

  if (brand_id) q.where('brand = ?', brand_id)

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
