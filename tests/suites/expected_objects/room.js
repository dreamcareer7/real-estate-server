var user = require('./user.js');
var notification = require('./notification.js');
var recommendation = require('./recommendation.js');


module.exports = {
  "type": "room",
  "id": String,
  "title": String,
  "owner": user,
  "created_at": Number,
  "updated_at": Number,
  "status": String,
  "lead_agent": function(val) { expect(val).toBeTypeOrNull(user); },
  "room_code": Number,
  "deleted_at": function(val) { expect(val).toBeTypeOrNull(Number); },
  "room_type": String,
  "client_type": String,
  "latest_message": {
    "type": String,
    "id": String,
    "comment": String,
    "image_url": function(val) { expect(val).toBeTypeOrNull(String); },
    "document_url": function(val) { expect(val).toBeTypeOrNull(String); },
    "video_url": function(val) { expect(val).toBeTypeOrNull(String); },
    "recommendation": function(val) { expect(val).toBeTypeOrNull(String); },
    "author": function(val) { expect(val).toBeTypeOrNull(user); },
    "created_at": Number,
    "updated_at": Number,
    "message_type": String,
    "image_thumbnail_url": function(val) { expect(val).toBeTypeOrNull(String); },
    "deleted_at": function(val) { expect(val).toBeTypeOrNull(Number); },
    "notification": function(val) { expect(val).toBeTypeOrNull(notification); },
    "reference": null
  },
  "users": function(val) { expect(val).toBeTypeOrNull([user]); }
};