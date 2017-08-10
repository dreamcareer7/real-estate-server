const v = require('./validation.js')

module.exports = {
  id: String,
  deal_type: String,

  context: {
    legal_description: String,
    type: String
  },

  proposed_values: v.optionalObject
}
