const v = require('./validation.js')

module.exports = {
  id: String,

  context: {
    deal_type: String,
    legal_description: String,
    type: String
  },

  proposed_values: v.optionalObject
}
