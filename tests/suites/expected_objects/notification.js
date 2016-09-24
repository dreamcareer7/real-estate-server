const user = require('./user.js')
const recommendation = require('./recommendation.js')
const v = require('./validation.js')

const optionalRecommendationArray = function (val) {
  expect(val).toBeTypeOrNull([recommendation])
}

const optionalUserArray = function (val) {
  expect(val).toBeTypeOrNull([user])
}

module.exports = {
  'type':                    String,
  'id':                      String,
  'message':                 String,
  'created_at':              Number,
  'updated_at':              Number,
  'room':                    v.optionalString,
  'action':                  String,
  'object_class':            v.optionalString,
  'auxiliary_object_class':  v.optionalString,
  'auxiliary_object':        v.optionalObject,
  'recommendation':          v.optionalString,
  'auxiliary_subject':       v.optionalObject,
  'subject_class':           String,
  'auxiliary_subject_class': v.optionalString,
  'extra_subject_class':     v.optionalString,
  'extra_object_class':      v.optionalString,
  'deleted_at':              v.optionalNumber,
//   "specific": v.optionalString,
  'notification_type':       String,
  'objects':                 v.optionalArray,
  'subjects':                optionalUserArray,
  'recommendations':         optionalRecommendationArray
}
