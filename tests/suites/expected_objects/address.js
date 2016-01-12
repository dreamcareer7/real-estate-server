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
  "title": optionalString,
  "subtitle": optionalString,
  "street_number": optionalString,
  "street_name": optionalString,
  "city": optionalString,
  "state": optionalString,
  "state_code": optionalString,
  "postal_code": optionalString,
  "neighborhood": optionalString,
  "id": String,
  "street_suffix": optionalString,
  "unit_number": optionalString,
  "country": optionalString,
  "country_code": optionalString,
  "created_at": Number,
  "updated_at": Number,
  "location_google": optionalString,
  "matrix_unique_id": String,
  "geocoded": optionalBoolean,
  "geo_source": optionalString,
  "partial_match_google": optionalBoolean,
  "county_or_parish": optionalString,
  "direction": optionalString,
  "street_dir_prefix": optionalString,
  "street_dir_suffix": optionalString,
  "street_number_searchable": optionalString,
  "geo_source_formatted_address_google": optionalString,
  "geocoded_google": optionalBoolean,
  "geocoded_bing": optionalBoolean,
  "location_bing": optionalString,
  "geo_source_formatted_address_bing": optionalString,
  "geo_confidence_google": optionalString,
  "geo_confidence_bing": optionalString,
  "location": optionalLocation,
  "approximate": optionalBoolean,
  "corrupted": optionalBoolean,
  "corrupted_google": optionalBoolean,
  "corrupted_bing": optionalBoolean,
  "deleted_at": optionalNumber,
  "type": String
};
