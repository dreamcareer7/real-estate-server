const v = require('./validation.js')

module.exports = {
  id: String,
  deal_type: String,

  mls_context: v.optionalObject,
}
