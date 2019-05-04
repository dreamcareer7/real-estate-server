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

    /**
     * @param {string} k
     * @param {string | number | Partial<IContactAttributeInput>} v
     */
    function getAttr(k, v) {
      return {
        ...value(v),
        is_partner: /^spouse_/.test(k),
        attribute_type: key(k)
      }
    }

    /** @type {IContactAttributeInput[]} */
    let result = []

    for (const [k, v] of Object.entries(attrs)) {
      if (Array.isArray(v)) {
        result = result.concat(v.map(getAttr.bind(null, k)))
      }
      else {
        result.push(getAttr(k, v))
      }
    }

    return result
  }
}
