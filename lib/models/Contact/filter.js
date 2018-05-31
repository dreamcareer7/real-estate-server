const sq = require('squel').useFlavour('postgres')
const squel = require('squel')

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
 * @param {Record<UUID, IContactAttributeDef>} defs_by_id Attribute defs index
 * @returns {squel.PostgresSelect=}
 */
function attributeFilterQuery(attribute_filters, defs_by_id) {
  if (!Array.isArray(attribute_filters)) return

  for (let i = 0; i < attribute_filters.length; i++) {
    const f = attribute_filters[i]
    if (!defs_by_id[f.attribute_def])
      throw Error.Validation(`AttributeDef ${f.attribute_def} in filter #${i} does not exist.`)
  }

  return attribute_filters.map(f => {
    const def = defs_by_id[f.attribute_def]
    return {
      attribute_def: def,
      field: def.data_type,
      operator: operatorMap(f.operator),
      expression: expressionMap(f.operator, f.value, def),
      value: f.value,
      invert: f.invert
    }
  }).map(f => {
    const def = f.attribute_def

    const sub_q = sq.select()
      .field('contact')
      .from('contacts_attributes')

    if (def) {
      sub_q
        .where('deleted_at IS NULL')
        .where('attribute_def = ?', f.attribute_def.id)
        .where(`${f.field} ${f.operator} ${f.expression}`, f.value)
    }
    else {
      sub_q.where('False')
    }

    if (f.invert) {
      return sq.select().field('id').from('contacts').where('id <> ALL(?)', sub_q)
    }
    return sub_q
  }).reduce((q, sub_q) => {
    if (!q) 
      return sub_q

    return q.union(sub_q, 'INTERSECT')
  })
}

module.exports = attributeFilterQuery