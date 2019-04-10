/**
 * @typedef {string | number | Partial<IContactAttributeInput>} TAttrType
 */

module.exports = {
  /**
   * @param {{ [x: string]: TAttrType | TAttrType[]; }} attrs
   */
  attributes(attrs) {
    /**
     * @param {TAttrType} val
     * @returns {IContactAttributeInput}
     */
    function value(val) {
      if (typeof val === 'string') return {
        text: val
      }

      if (typeof val === 'number') return {
        date: val
      }

      return val
    }

    /**
     * @param {string} k
     */
    function key(k) {
      return k.replace(/^spouse_/g, '')
    }

    /** @type {IContactAttributeInput[]} */
    let result = []

    for (const [k, v] of Object.entries(attrs)) {
      if (Array.isArray(v)) {
        result = result.concat(v.map(item => ({ ...value(item), attribute_type: key(k)})))
      }
      else {
        result.push({ ...value(v), attribute_type: key(k)})
      }
    }

    return result
  }
}
