const user = require('./user.js')
const message = require('./message.js')
const v = require('./validation.js')

module.exports = {
  'type': 'room',
  'id': String,
  'title': v.optionalString,
  'owner': function (val) { expect(val).toBeTypeOrNull(user) },
  'created_at': Number,
  'updated_at': Number,
  'status': String,
  'lead_agent': function (val) { expect(val).toBeTypeOrNull(user) },
  'room_code': Number,
  'deleted_at': v.optionalNumber,
  'room_type': String,
  'client_type': String,
  'latest_message': function (val) { expect(val).toBeTypeOrNull(message) },
  'users': function (val) { expect(val).toBeTypeOrNull([user]) }
}
