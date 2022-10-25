/**
 * @typedef {string | number | Partial<IContactAttributeInput>} TAttrType
 */

const address_attrs = [
  'postal_code',
  'street_number',
  'street_prefix',
  'street_suffix',
  'unit_number',
  'country',
  'street_name',
  'city',
  'state',
  'county',
]

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

      if (val instanceof Date) return {
        date: val.getTime() / 1000
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
     * @param {number=} i
     */
    function getAttr(k, v, i) {
      function a(is_partner, k, v, i) {
        const attr = {
          ...value(v),
          is_partner,
          attribute_type: key(k)
        }
  
        if (address_attrs.includes(attr.attribute_type) && typeof attr.index !== 'number') {
          attr.index = i
        }
  
        return attr
      }

      const is_partner = /^spouse_/.test(k)

      if (k === 'address') {
        return Object.keys(v).map(k => a(is_partner, k, v[k], i))
      }

      return a(is_partner, k, v, i)
    }

    /** @type {IContactAttributeInput[]} */
    let result = []

    for (const [k, v] of Object.entries(attrs)) {
      if (Array.isArray(v)) {
        result = result.concat(v.flatMap((vv, i) => getAttr(k, vv, i)))
      }
      else {
        result = result.concat(getAttr(k, v, 0))
      }
    }

    return result
  }
}
