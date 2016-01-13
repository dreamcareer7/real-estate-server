var user = require('./user.js');
var notification = require('./notification.js');
var recommendation = require('./recommendation.js');
var message = require('./message.js');

var optionalString = function(val) {
  expect(val).toBeTypeOrNull(String);
};

var optionalNumber = function(val) {
  expect(val).toBeTypeOrNull(Number);
};

var optionalArray = function(val) {
  expect(val).toBeTypeOrNull(Array);
};

var optionalBoolean = function(val) {
  expect(val).toBeTypeOrNull(Boolean);
};

var optionalUser = function(val) {
  expect(val).toBeTypeOrNull(user);
};

var optionalMessage = function(val) {
  expect(val).toBeTypeOrNull(message);
};

module.exports = {
  "type": "room",
  "id": String,
  "title": optionalString,
  "owner": optionalUser,
  "created_at": Number,
  "updated_at": Number,
  "status": String,
  "lead_agent": optionalUser,
  "room_code": Number,
  "deleted_at": optionalNumber,
  "room_type": String,
  "client_type": String,
  "latest_message": optionalMessage,
  "users": function(val) { expect(val).toBeTypeOrNull([user]); }
};
