const squel = require('@rechat/squel').useFlavour('postgres')

class SqArray extends Array {}
squel.SqArray = SqArray

squel.registerValueHandler(SqArray, function(arr) {
  return arr
})

squel.registerValueHandler('undefined', function(arr) {
  return null
})

module.exports = squel
