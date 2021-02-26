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
  return arr1.length === arr2.length &&
    xorWith(arr1, arr2, isEqual).length === 0
}

module.exports = {
  haveSameMembers,
}
