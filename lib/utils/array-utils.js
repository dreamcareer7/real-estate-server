const isEqual = require('lodsah/isEqual')

/**
 * returns true when the arrays have deep same members
 * @template T
 * @param {T[]} arr1
 * @param {T[]} arr2
 * @returns {boolean}
 */
const haveSameMembers = (arr1, arr2) => {
  return isEqual(arr1.sort(), arr2.sort())
}

module.exports = {
  haveSameMembers,
}
