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

  if (!val.latitude || typeof (val.latitude) != 'number')
    throw 'Location.latitude is required'

  if (!val.longitude || typeof (val.longitude) != 'number')
    throw 'Location.longitude is required'

  if (!val.type || typeof (val.type) != 'string' || val.type != 'location')
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
