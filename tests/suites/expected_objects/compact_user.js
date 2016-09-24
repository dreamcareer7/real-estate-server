const v = require('./validation.js')

module.exports = {
  'id':                String,
  'first_name':        String,
  'last_name':         String,
  'profile_image_url': v.optionalString,
  'created_at':        Number,
  'updated_at':        Number,
  'type':              'compact_user'
}
