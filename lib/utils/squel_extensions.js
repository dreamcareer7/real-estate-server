const originalSquel = require('@rechat/squel').useFlavour('postgres')

class SqArray extends Array {
  clone() {
    return SqArray.from(this)
  }
}

const squel = Object.assign(originalSquel, { SqArray })

/**
 * @callback ColumnMapper
 * @param {string} col
 * @returns {string}
 */
/**
 * @this OrderByBlock
 * @param {Object} opts
 * @param {string[]} opts.on - Valid columns (example: ['a', 'b', 'c'])
 * @param {string[] | string} opts.by - Signed expressions (example: ['a', '-b', '+c'])
 * @param {ColumnMapper=} [opts.mapper] - Optional column mapper
 * @returns {this}
 */
squel.cls.OrderByBlock.prototype.signedOrder = function signedOrder ({
  on: columns,
  by: expressions,
  mapper: mapColumn = c => c,
}) {
  // TODO: somehow add this new method to squel types...
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

    this.order(mapColumn(col), expr[0] !== '-')
  }

  return this
}

Object.assign(squel.cls.WithBlock.prototype, {
  /**
   * @this {import('@rechat/squel').WithBlock}
   * @param {Parameters<import('@rechat/squel').WithBlock['with']>[0]} alias
   * @param {Parameters<import('@rechat/squel').WithBlock['with']>[1]} table
   * @param {object=} [opts]
   * @param {boolean?=} [opts.materialized]
   * @param {boolean?=} [opts.recursive]
   */
  with (alias, table, { materialized = null, recursive = null } = {}) {
    this._tables.push({ alias, table, materialized })
    this._recursive = this._recursive || recursive
  },

  /** @this {import('@rechat/squel').WithBlock} */
  _toParamString (options = {}) {
    const parts = [], values = []

    for (const { alias, table, materialized } of this._tables) {
      const ret = table._toParamString({
        buildParameterized: options.buildParameterized,
        nested: true,
      })

      const mat = materialized === false
        ? 'NOT MATERIALIZED ' : materialized
        ? 'MATERIALIZED ' : ''

      parts.push(`${alias} AS ${mat}${ret.text}`)
      values.push(...ret.values)
    }

    const rec = this._recursive ? 'RECURSIVE ' : ''

    return {
      text: parts.length ? `WITH ${rec}${parts.join(', ')}` : '',
      values,
    }
  },
})

squel.registerValueHandler(SqArray, function(arr, asParam, formattingOptions) {
  if (asParam) return arr

  return `'{${arr}}'`
})

squel.registerValueHandler('undefined', /** @returns {any} */ () => null)

module.exports = squel
