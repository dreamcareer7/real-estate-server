const v = require('./validation.js')

module.exports = {
  id: String,
  formstack_id: Number,
  fields: Object,
  name: String,
  type: String,
  roles: v.optionalArray
}
