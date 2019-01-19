const _u = require('underscore')

const optionalString = function (val) {
  expect(val).toBeTypeOrNull(String)
}

const optionalNumber = function (val) {
  expect(val).toBeTypeOrNull(Number)
}

const optionalArray = function (val) {
  expect(val).toBeTypeOrNull(Array)
}

const optionalBoolean = function (val) {
  expect(val).toBeTypeOrNull(Boolean)
}

const optionalStringArray = function (val) {
  expect(val).toBeTypeOrNull([String])
}

const optionalObject = function (val) {
  expect(val).toBeTypeOrNull(Object)
}

const optionalLocation = function (val) {
  if (!val)
    return

  if (!_u.isNumber(val.latitude))
    throw 'Location.latitude is required'

  if (!_u.isNumber(val.longitude))
    throw 'Location.longitude is required'

  if (!_u.isString(val.type) || val.type !== 'location')
    throw 'Location.type is required'
}

module.exports = {
  optionalString,
  optionalNumber,
  optionalArray,
  optionalBoolean,
  optionalStringArray,
  optionalObject,
  optionalLocation
}
