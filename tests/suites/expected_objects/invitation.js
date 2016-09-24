const user = require('./user.js')
const v = require('./validation.js')

module.exports =
{
  'type':               String,
  'id':                 String,
  'invited_user':       user,
  'email':              String,
  'room':               String,
  'created_at':         Number,
  'updated_at':         Number,
  'accepted':           Boolean,
  'inviting_user':      user,
  'deleted_at':         v.optionalNumber,
  'phone_number':       String,
  'invitee_first_name': String,
  'invitee_last_name':  String
}
