const originalSquel = require('@rechat/squel').useFlavour('postgres')

class SqArray extends Array {
  clone() {
    return SqArray.from(this)
  }
}

/**
 * @typedef {import('@rechat/squel/dist/squel').OrderByMixin} OrderByMixin
 *
 * @callback ColumnMapper
 * @param {string} col
 * @returns {string}
 */
/**
 * @template {OrderByMixin} QB
 * @param {QB} q - The query builder instance object
 * @param {Object} opts
 * @param {string[]} opts.on - Valid columns (example: ['a', 'b', 'c'])
 * @param {string[] | string} opts.by - Signed expressions (example: ['a', '-b', '+c'])
 * @param {ColumnMapper=} [opts.mapper] - Optional column mapper
 * @returns {QB}
 */
function signedOrder (q, {
  on: columns,
  by: expressions,
  mapper: mapColumn = c => c,
}) {
  if (typeof expressions === 'string') {
    expressions = expressions.trim().split(/\s*,\s*/)
  }
  
  if (expressions.length > columns.length) {
    throw Error.Validation('Too many order columns')
  }

  for (const expr of expressions) {
    const col = '+-'.includes(expr[0]) ? expr.substr(1) : expr
    
    if (!columns.includes(col)) {
      throw Error.Validation(`Invalid order column: '${col}'. Valid columns: ${columns.join(', ')}`)
    }
    
    q.order(mapColumn(col), expr[0] !== '-')
  }

  return q
}

const squel = Object.assign(originalSquel, { SqArray, signedOrder })

squel.registerValueHandler(SqArray, function(arr, asParam, formattingOptions) {
  if (asParam) return arr

  return `'{${arr}}'`
})

squel.registerValueHandler('undefined', /** @returns {any} */ () => null)

module.exports = squel
