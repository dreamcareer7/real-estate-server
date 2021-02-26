const isEqual = require('lodash/isEqual')
const xorWith = require('lodash/xorWith')

/**
 * returns true when the arrays have deep same members
 * @template T
 * @param {T[]} arr1
 * @param {T[]} arr2
 * @returns {boolean}
 */
const haveSameMembers = (arr1, arr2) => {
  if (!Array.isArray(arr1) ||
      !Array.isArray(arr2) ||
      arr1.length !== arr2.length) {
    return false
  }
  
  return xorWith(arr1, arr2, isEqual).length === 0
}

module.exports = {
  haveSameMembers,
}
