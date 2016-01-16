var user = require('./user.js');
var notification = require('./notification.js');
var recommendation = require('./recommendation.js');
var message = require('./message.js');
var v = require('../../../lib/utils/response_validation.js');

module.exports = {
  "type": "room",
  "id": String,
  "title": v.optionalString,
  "owner": function(val) { expect(val).toBeTypeOrNull(user); },
  "created_at": Number,
  "updated_at": Number,
  "status": String,
  "lead_agent": function(val) { expect(val).toBeTypeOrNull(user); },
  "room_code": Number,
  "deleted_at": v.optionalNumber,
  "room_type": String,
  "client_type": String,
  "latest_message": function(val) { expect(val).toBeTypeOrNull(message); },
  "users": function(val) { expect(val).toBeTypeOrNull([user]); }
};
