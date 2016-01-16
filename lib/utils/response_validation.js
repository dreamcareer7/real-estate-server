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

var optionalStringArray = function(val) {
  expect(val).toBeTypeOrNull([String]);
};

var optionalObject = function(val) {
  expect(val).toBeTypeOrNull(Object);
};

var optionalLocation = function(val) {
  if (!val)
    return;

  if (!val.latitude || typeof(val.latitude) != 'number')
    throw 'Location.latitude is required';

  if (!val.longitude || typeof(val.longitude) != 'number')
    throw 'Location.longitude is required';

  if (!val.type || typeof(val.type) != 'string' || val.type != 'location')
    throw 'Location.type is required';
};

module.exports = {
  optionalString,
  optionalNumber,
  optionalArray,
  optionalBoolean,
  optionalStringArray,
  optionalObject,
  optionalLocation
};
