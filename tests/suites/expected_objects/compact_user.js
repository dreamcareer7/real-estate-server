module.exports = {
  "id": String,
  "first_name": String,
  "last_name": String,
  "profile_image_url": function(val) { expect(val).toBeTypeOrNull(String); },
  "created_at": Number,
  "updated_at": Number,
  "type": "compact_user"
};