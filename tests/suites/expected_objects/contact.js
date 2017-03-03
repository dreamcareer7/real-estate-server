const v = require('./validation.js')

module.exports = {
  'id': String,
  'created_at': Number,
  'updated_at': Number,
  'users': v.optionalArray,
  'sub_contacts': v.optionalArray
}
