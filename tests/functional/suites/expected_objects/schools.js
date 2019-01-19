const v = require('./validation.js')

module.exports = {
  'schools': {
    'name': String,
    'appearances': String,
    'district': v.optionalString,
    'school_type': String,
    'type': String
  },
  'districts': {
    'district': v.optionalString,
    'type': String,
  }
}
