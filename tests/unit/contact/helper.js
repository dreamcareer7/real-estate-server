module.exports = {
  /**
   * @param {{ [x: string]: string | number | Partial<IContactAttribute>; }} attrs
   */
  attributes(attrs) {
    /**
     * @param {string | number | Partial<IContactAttribute>} val
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

    /** @type {IContactAttributeInput[]} */
    const result = []

    for (const k in attrs) {
      if (k.startsWith('spouse_')) {
        result.push({
          ...value(attrs[k]),
          attribute_type: k.replace(/^spouse_/g, ''),
          is_partner: true
        })
      }
      else {
        result.push({
          ...value(attrs[k]),
          attribute_type: k
        })
      }
    }

    return result
  }
}
