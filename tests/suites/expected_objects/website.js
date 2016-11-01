const v = require('./validation.js')

module.exports = {
  id: String,
  user: Object,
  template: String,
  attributes: Object,
  type: String,
  hostnames: v.optionalArray
}
