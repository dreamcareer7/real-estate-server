const H = require('../jsonSchemaHelper')

module.exports = H.schema({
  deal_context: H.Required(H.Object({
    listing_status: H.Required(H.Object({
      approved_at: H.Required(H.Number),
      approved_by: H.Required(H.String)
    }))
  }))
})
