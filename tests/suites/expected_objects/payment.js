const v = require('./validation.js')

module.exports = {
  customer: {
    id: String,
    type: 'stripe_customer',
    owner: String,
    customer_id: String,
    source: Object
  }
}
