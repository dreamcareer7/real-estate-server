var user = require('./user.js');

module.exports = {
  "type": "message",
  "id": String,
  "comment": String,
  "image_url": null,
  "document_url": null,
  "video_url": null,
  "recommendation": null,
  "author": user,
  "created_at": Number,
  "updated_at": Number,
  "message_type": String,
  "image_thumbnail_url": null,
  "deleted_at": null,
  "notification": null,
  "reference": null
};