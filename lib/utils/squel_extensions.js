const originalSquel = require('@rechat/squel').useFlavour('postgres')

class SqArray extends Array {
  clone() {
    return SqArray.from(this)
  }
}

function signedOrder (q, {
  on: onColumns,
  by: byColumns,
  mapper: mapColumn = c => c,
}) {
  
  
  
  byColumns
    .map(expr => [
      '+-'.includes(expr[0]) ? expr.substr(1) : expr,
      expr[0] !== '-',
    ])
    .forEach(([col, dir]) => {
      if (onColumns.includes(col)) {
        throw Error.Validation(`Invalid order column: ${col}`)  
      }
      
      q.order(mapColumn(col), dir)
    })
}

const squel = Object.assign(originalSquel, { SqArray })

squel.registerValueHandler(SqArray, function(arr, asParam, formattingOptions) {
  if (asParam) return arr

  return `'{${arr}}'`
})

squel.registerValueHandler('undefined', /** @returns {any} */ () => null)

module.exports = squel
