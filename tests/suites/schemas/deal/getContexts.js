const H = require('../jsonSchemaHelper')

module.exports = H.schemaArray({
  items: H.Object({
    name: H.Required(H.String),
    type: H.Required(H.String),
    property_type: H.Array({
      minItems: 1
    })
  })
})
