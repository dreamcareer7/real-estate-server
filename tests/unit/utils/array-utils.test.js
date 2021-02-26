const { expect } = require('chai')
const { haveSameMembers } = require('../../../lib/utils/array-utils')

describe('utils/array-utils', () => {
  describe('.haveSameMembers()', () => {
    it('needs two required arguments', () => {
      expect(haveSameMembers).to.have.lengthOf(2)
    })

    it('returns false for non-array argument(s)', () => {
      const arr = ['foo', 'bar']

      expect(haveSameMembers(arr, null)).to.be.false
      expect(haveSameMembers(undefined, arr)).to.be.false
      expect(haveSameMembers(1, arr)).to.be.false
      expect(haveSameMembers(arr, true)).to.be.false
      expect(haveSameMembers(arr, {})).to.be.false
    })
    
    it('returns true when the arguments have same members', () => {
      const obj1 = { baz: ['qux', 'nux'], qux: { bar: 'foo' }, foo: 'bar' }
      const obj2 = { foo: 'bar', baz: ['qux', 'nux'], qux: { bar: 'foo' } }
      
      const arr1 = [1, '3', 'foo', null, undefined, true, 4n, obj1]
      const arr2 = [undefined, true, 'foo', obj2, 4n, 1, '3', null]

      expect(haveSameMembers(arr1, arr2)).to.be.true
    })
    
    it('return false when there\'s some difference(s) between the arrays', () => {
      expect(haveSameMembers(['1'], [1])).to.be.false
      expect(haveSameMembers([1n], [1])).to.be.false
      expect(haveSameMembers([null], [undefined])).to.be.false
    })
  })
})
