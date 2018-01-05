const H = require('../jsonSchemaHelper')

const DealContext = H.Object({
  id: H.String,
  context_type: H.String,
})

module.exports = H.schema({
  deal_context: H.Required(H.Object({
    listing_status: H.Required(DealContext),
    year_built: H.Required(DealContext),
    contract_date: H.Required(DealContext),
    closing_date: H.Required(DealContext),
    list_date: H.Required(DealContext),
    sales_price: H.Required(DealContext),
    commission_listing: H.Required(DealContext),
    commission_selling: H.Required(DealContext),
    unit_number: H.Required(DealContext)
  }))
})
