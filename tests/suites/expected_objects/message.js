const user = require('./user.js')
const recommendation = require('./recommendation.js')
const notification = require('./notification.js')
const v = require('./validation.js')

const optionalRecommendation = function (val) {
  expect(val).toBeTypeOrNull(recommendation)
}

const optionalNotification = function (val) {
  expect(val).toBeTypeOrNull(notification)
}

module.exports = {
  'type': 'message',
  'id': String,
  'comment': String,
  'image_url': v.optionalString,
  'document_url': v.optionalString,
  'video_url': v.optionalString,
  'recommendation': optionalRecommendation,
  'author': user,
  'created_at': Number,
  'updated_at': Number,
  'image_thumbnail_url': v.optionalString,
  'deleted_at': v.optionalNumber,
  'notification': optionalNotification,
  'reference': v.optionalString
}
