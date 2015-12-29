var user = require('./user.js');
var recommendation = require('./recommendation.js');

module.exports = {
  "type": String,
  "id": String,
  "message": String,
  "created_at": Number,
  "updated_at": Number,
  "room": String,
  "action": String,
  "object_class": function(val) { expect(val).toBeTypeOrNull(String); },
  "auxiliary_object_class": function(val) { expect(val).toBeTypeOrNull(String); },
  "auxiliary_object": function(val) { expect(val).toBeTypeOrNull(String); },
  "recommendation": function(val) { expect(val).toBeTypeOrNull(String); },
  "auxiliary_subject": function(val) { expect(val).toBeTypeOrNull(Object); },
  "subject_class": String,
  "auxiliary_subject_class": function(val) { expect(val).toBeTypeOrNull(String); },
  "extra_subject_class": function(val) { expect(val).toBeTypeOrNull(String); },
  "extra_object_class": function(val) { expect(val).toBeTypeOrNull(String); },
  "deleted_at": function(val) { expect(val).toBeTypeOrNull(Number); },
  "specific": function(val) { expect(val).toBeTypeOrNull(String); },
  "notification_type": String,
  "objects": function(val) { expect(val).toBeTypeOrNull(Array); },
  "subjects": [function(val) { expect(val).toBeTypeOrNull(user); }],
  "recommendations": function(val) { expect(val).toBeTypeOrNull([recommendation]); },
};