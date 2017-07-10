const v = require('./validation.js')
const user = require('./user.js')

module.exports = {
  'id': String,
  'created_at': Number,
  'updated_at': Number,
  'users': function(v) { expect(v).toBeTypeOrNull([user]) },
  'sub_contacts': v.optionalArray
}
