const _ = require('lodash')

function apply(array, applyF, bunchSize) {
  if (!_.isArray(array)) {
    return Promise.reject(new Error('Should be an array'))
  }
  if (!_.isFunction(applyF)) {
    return Promise.reject(new Error('Should be a function'))
  }
  let size = 0
  const promises = []
  const length = array.length
  
  while(size < length) {
    promises.push(applyF(_.take(array, bunchSize)))
    array = _.drop(array, bunchSize)
    size = size + bunchSize
  }
  return Promise.all(promises)
}

module.exports = {
  apply
}