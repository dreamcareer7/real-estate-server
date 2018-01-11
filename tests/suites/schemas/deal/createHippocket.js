const H = require('../jsonSchemaHelper')

module.exports = H.schema({
  deal_context: H.Object({
    full_address: H.Required(H.Object())
  }),
  roles: H.Required(H.Array({
    minItems: 3,
    items: H.Object()
  }))
})
