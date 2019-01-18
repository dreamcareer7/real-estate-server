const H = require('../jsonSchemaHelper')

module.exports = H.schema({
  id: H.String,
  title: H.String,
  deal: H.String,
  order: H.Number,
  origin: H.Nullable(H.String),
  deactivated_at: H.Null,
  terminated_at: H.Null
})
