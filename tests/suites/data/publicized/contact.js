var user = require('./user.js');

module.exports = {
  "id": String,
  "contact_user": user,
  "created_at": Number,
  "updated_at": Number,
  "deleted_at": function(val) { expect(val).toBeTypeOrNull(Number); },
  "first_name": function(val) { expect(val).toBeTypeOrNull(String); },
  "last_name": function(val) { expect(val).toBeTypeOrNull(String); },
  "phone_number": String,
  "email": String,
  "profile_image_url": function(val) { expect(val).toBeTypeOrNull(String); },
  "invitation_url": function(val) { expect(val).toBeTypeOrNull(String); },
  "company": function(val) { expect(val).toBeTypeOrNull(String); },
  "address": function(val) { expect(val).toBeTypeOrNull(String); },
  "birthday": null,
  "cover_image_url": function(val) { expect(val).toBeTypeOrNull(String); },
  "type": "contact",
  "tags": function(val) { expect(val).toBeTypeOrNull(Array); },
}

