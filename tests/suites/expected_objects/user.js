const v = require('./validation.js')

module.exports = {
  'type': String,
  'username': v.optionalString,
  'first_name': String,
  'last_name': String,
  'email': String,
  'phone_number': v.optionalString,
  'created_at': Number,
  'id': String,
  'cover_image_url': v.optionalString,
  'profile_image_url': v.optionalString,
  'updated_at': Number,
  'user_status': String,
  'profile_image_thumbnail_url': v.optionalString,
  'cover_image_thumbnail_url': v.optionalString,
  'email_confirmed': Boolean,
  'timezone': String,
  'user_code': Number,
  'user_type': String,
  'deleted_at': v.optionalString,
  'phone_confirmed': Boolean,
  'current_time': String,
  'push_allowed': Boolean,
  'address': v.optionalString,
  'invitation_url': String
}
