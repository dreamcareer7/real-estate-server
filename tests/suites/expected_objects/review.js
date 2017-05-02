const v = require('./validation.js')

module.exports = {
  'id': String,
  'type': 'review',
  'created_at': Number,
  'updated_at': Number,
  'deleted_at': v.optionalNumber,
  'deal': String,
  'file': v.optionalString,
  'envelope_document': v.optionalString,
  'state': String,
  'comment': v.optionalString,
}
