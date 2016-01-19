var user = require('./user.js');
var recommendation = require('./recommendation.js');
var v = require('../../../lib/utils/response_validation.js');

var optionalRecommendationArray = function(val) {
  expect(val).toBeTypeOrNull([recommendation]);
};

var optionalUserArray = function(val) {
  expect(val).toBeTypeOrNull([user]);
};

module.exports = {
  "type": String,
  "id": String,
  "message": String,
  "created_at": Number,
  "updated_at": Number,
  "room": String,
  "action": String,
  "object_class": v.optionalString,
  "auxiliary_object_class": v.optionalString,
  "auxiliary_object": v.optionalString,
  "recommendation": v.optionalString,
  "auxiliary_subject": v.optionalObject,
  "subject_class": String,
  "auxiliary_subject_class": v.optionalString,
  "extra_subject_class": v.optionalString,
  "extra_object_class": v.optionalString,
  "deleted_at": v.optionalNumber,
  "specific": v.optionalString,
  "notification_type": String,
  "objects": v.optionalObject,
  "subjects": optionalUserArray,
  "recommendations": optionalRecommendationArray
};