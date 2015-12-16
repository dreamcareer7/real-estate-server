var user = require('./user.js');

module.exports = {
  "id": String,
  "contact_user": user,
  "created_at": Number,
  "updated_at": Number,
  "deleted_at": null,
  "first_name": null,
  "last_name": null,
  "phone_number": String,
  "email": String,
  "profile_image_url": null,
  "invitation_url": null,
  "company": null,
  "address": null,
  "birthday": null,
  "cover_image_url": null,
  "type": "contact",
  "tags": null
}

