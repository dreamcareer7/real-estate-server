var user = require('./user.js');
var recommendation = require('./recommendation.js');
var notification = require('./notification.js');
var v = require('../../../lib/utils/response_validation.js');

var optionalRecommendation = function(val) {
  expect(val).toBeTypeOrNull(recommendation);
};

var optionalNotification = function(val) {
  expect(val).toBeTypeOrNull(notification);
};

module.exports = {
  "type": "message",
  "id": String,
  "comment": String,
  "image_url": v.optionalString,
  "document_url": v.optionalString,
  "video_url": v.optionalString,
  "recommendation": optionalRecommendation,
  "author": user,
  "created_at": Number,
  "updated_at": Number,
  "message_type": String,
  "image_thumbnail_url": v.optionalString,
  "deleted_at": v.optionalNumber,
  "notification": optionalNotification,
  "reference": v.optionalString
};