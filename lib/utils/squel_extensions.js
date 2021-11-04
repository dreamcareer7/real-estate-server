const originalSquel = require('@rechat/squel').useFlavour('postgres')

class SqArray extends Array {
  clone() {
    return SqArray.from(this)
  }
}

const squel = Object.assign(originalSquel, { SqArray })

squel.registerValueHandler(SqArray, function(arr, asParam, formattingOptions) {
  if (asParam) return arr

  return `'{${arr}}'`
})

squel.registerValueHandler('undefined', /** @returns {any} */ () => null)

module.exports = squel
