var user = require('./user.js');
var v = require('../../../lib/utils/response_validation.js');

module.exports = {
  "type": "message",
  "id": String,
  "comment": String,
  "image_url": v.optionalString,
  "document_url": v.optionalString,
  "video_url": v.optionalString,
  "recommendation": null,
  "author": user,
  "created_at": Number,
  "updated_at": Number,
  "message_type": String,
  "image_thumbnail_url": v.optionalString,
  "deleted_at": v.optionalNumber,
  "notification": null,
  "reference": v.optionalString
};