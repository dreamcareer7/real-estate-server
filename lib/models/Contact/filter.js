const _ = require('lodash')
const sq = require('squel').useFlavour('postgres')
// eslint-disable-next-line no-unused-vars
const squel = require('squel')

const AttributeDef = require('./attribute_def')

/**
 * 
 * @param {'eq' | 'lte' | 'gte' | 'between' | 'any' | 'all'} op 
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
 * Generate a squel query for complex filtering on attributes
 * @param {IContactAttributeFilter[]} attribute_filters Attribute filters
 * @returns {Promise<squel.PostgresSelect?>}
 */
async function attributeFilterQuery(attribute_filters) {
  if (!Array.isArray(attribute_filters)) return null

  const def_ids_to_get = attribute_filters.map(af => af.attribute_def)
  const defs = await AttributeDef.getAll(def_ids_to_get)
  const defs_by_id = _.keyBy(defs, 'id')
  const defs_by_name = _.keyBy(defs, 'name')

  for (let i = 0; i < attribute_filters.length; i++) {
    const f = attribute_filters[i]
    if (!defs_by_id[f.attribute_def] && !defs_by_name[f.attribute_type])
      throw Error.Validation(`AttributeDef ${f.attribute_def} in filter #${i} does not exist.`)
  }

  const filters = attribute_filters.map(f => {
    const def = defs_by_id[f.attribute_def] || defs_by_name[f.attribute_type]
    return {
      attribute_def: def,
      field: def.data_type,
      operator: operatorMap(f.operator),
      expression: expressionMap(f.operator, f.value, def),
      value: f.value,
      invert: f.invert
    }
  })

  const sub_q_fn = f => {
    const def = f.attribute_def

    const sub_q = sq.select()
      .field('contact')
      .from('contacts_attributes')

    if (def) {
      sub_q
        .where('deleted_at IS NULL')
        .where('attribute_def = ?', def.id)
        .where(`${f.field} ${f.operator} ${f.expression}`, f.value)
    }
    else {
      sub_q.where('False')
    }

    return sub_q
  }

  const inverted_filters = filters.filter(f => f.invert)
  let inverted_sub_q

  if (inverted_filters.length > 0)
    inverted_sub_q = inverted_filters
      .map(sub_q_fn)
      .reduce((q, sub_q) => {
        if (!q)
          return sub_q

        return q.union(sub_q)
      })

  let filter_query = filters
    .filter(f => !f.invert)
    .map(sub_q_fn)

  if (inverted_sub_q)
    filter_query = filter_query
      .concat(sq.select().field('id').from('contacts').where('id <> ALL(?)', inverted_sub_q))

  return filter_query.reduce((q, sub_q) => {
    if (!q)
      return sub_q

    return q.union(sub_q, 'INTERSECT')
  })
}

/**
 * Generate a squel query for complex filtering on contacts with attributes
 * @param {IContactAttributeFilter[]} attribute_filters Attribute filters
 * @param {IContactFilterOptions & PaginationOptions} options
 * @returns {Promise<squel.Select>}
 */
async function contactFilterQuery(user_id, attribute_filters = [], options = {}) {
  if (!options) options = {}
  const terms = options.q

  const q = sq
    .select({
      rawNesting: true
    })
    .field('id')
    .field('COUNT(*) OVER()::INT', 'total')
    .from('contacts')

  if (Array.isArray(terms)) {
    for (const term of terms) {
      q.where('searchable_field ILIKE ?', '%' + term + '%')
    }
  }

  q.where('deleted_at IS NULL')

  if (options.list)
    q.where('id = ANY(?)', sq.select()
      .field('contact')
      .from('contact_lists_members')
      .where('list = ?', options.list)
      .where('deleted_at IS NULL'))

  if (options.ids)
    q.where('id = ANY(?)', [`{${options.ids.join(',')}}`])

  if (attribute_filters && !Array.isArray(attribute_filters))
    console.warn('[Contact.filter] attribute_filters should be an array.')

  if (user_id)
    q.where('check_contact_read_access(contacts, ?)', user_id)

  if (Array.isArray(attribute_filters) && attribute_filters.length > 0) {
    q.where(
      'id = ANY(?)',
      await attributeFilterQuery(attribute_filters)
    )
  }

  if (options.updated_gte)
    q.where('updated_at >= to_timestamp(?)', options.updated_gte)

  if (options.updated_lte)
    q.where('updated_at <= to_timestamp(?)', options.updated_lte)

  if (options.order) {
    if ('+-'.indexOf(options.order[0]) > -1) {
      q.order(options.order.substring(1), options.order[0] !== '-')
    } else {
      q.order(options.order)
    }
  }

  if (options.start) q.offset(options.start)
  if (options.limit) q.limit(options.limit)

  return q
}

module.exports = contactFilterQuery