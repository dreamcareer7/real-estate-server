const Helper = {
  schema(def) {
    return Object.assign({
      $schema: 'http://json-schema.org/draft-04/schema#',
    }, Helper.Object({
      data: Helper.Object(def),
    }))
  },

  schemaArray(def) {
    return Object.assign({
      $schema: 'http://json-schema.org/draft-04/schema#',      
    }, Helper.Object({
      data: Helper.Array(def),
    }))
  },

  Object(props = {}) {
    const def = Object.entries(props).reduce((res, [k, v]) => {
      res.properties[k] = v
      if (v.required === true) {
        delete v.required
        res.required.add(k)
      }

      return res
    }, {
      type: 'object',
      required: new Set(),
      properties: {}
    })

    def.required = Array.from(def.required)

    return def
  },

  Array(def) {
    return {
      type: 'array',
      ...def
    }
  },

  Nullable(def) {
    return Object.assign(def, {
      type: [def.type, 'null']
    })
  },

  Required(def) {
    return Object.assign(def, {
      required: true
    })
  }
}

function typeGetter(type) {
  return {
    get() {
      return { type }
    }
  }
}

Object.defineProperties(Helper, {
  String: typeGetter('string'),
  Number: typeGetter('number'),
  Null: typeGetter('null'),
  TimestampWithTimezone: {
    get: () => ({
      type: ['string'],
      pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{1,3}Z$/
    })
  },
})

module.exports = Helper