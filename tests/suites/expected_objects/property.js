var address = require('./address.js');

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

module.exports = {
  "type": String,
  "id": String,
  "bedroom_count": optionalNumber,
  "bathroom_count": optionalNumber,
  "description": optionalString,
  "square_meters": Number,
  "created_at": Number,
  "updated_at": Number,
  "matrix_unique_id": String,
  "property_type": String,
  "property_subtype": String,
  "lot_square_meters": optionalNumber,
  "year_built": function(val) { expect(val).toBeTypeOrNull(Number); },
  "accessibility_features": optionalArray,
  "commercial_features": optionalArray,
  "community_features": optionalArray,
  "energysaving_features": optionalArray,
  "exterior_features": optionalArray,
  "interior_features": optionalArray,
  "farmranch_features": optionalArray,
  "fireplace_features": optionalArray,
  "lot_features": optionalArray,
  "parking_features": optionalArray,
  "pool_features": optionalArray,
  "security_features": optionalArray,
  "bedroom_bathroom_features": Array,
  "parking_spaces_covered_total": Number,
  "half_bathroom_count": optionalNumber,
  "full_bathroom_count": optionalNumber,
  "heating": optionalArray,
  "flooring": optionalArray,
  "utilities": optionalArray,
  "utilities_other": optionalArray,
  "architectural_style": optionalString,
  "structural_style": optionalString,
  "number_of_stories": optionalNumber,
  "number_of_stories_in_building": optionalNumber,
  "number_of_parking_spaces": optionalNumber,
  "parking_spaces_carport": optionalNumber,
  "parking_spaces_garage": optionalNumber,
  "garage_length": optionalNumber,
  "garage_width": optionalNumber,
  "number_of_dining_areas": optionalNumber,
  "number_of_living_areas": optionalNumber,
  "fireplaces_total": optionalNumber,
  "lot_number": optionalString,
  "soil_type": optionalString,
  "construction_materials": optionalString,
  "construction_materials_walls": optionalString,
  "foundation_details": optionalString,
  "roof": optionalString,
  "pool_yn": optionalBoolean,
  "handicap_yn": optionalBoolean,
  "elementary_school_name": optionalString,
  "intermediate_school_name": optionalString,
  "high_school_name": optionalString,
  "junior_high_school_name": optionalString,
  "middle_school_name": optionalString,
  "primary_school_name": optionalString,
  "senior_high_school_name": optionalString,
  "school_district": optionalString,
  "subdivision_name": optionalString,
  "appliances_yn": optionalBoolean,
  "building_number": optionalString,
  "ceiling_height": optionalNumber,
  "green_building_certification": optionalString,
  "green_energy_efficient": optionalString,
  "lot_size": optionalNumber,
  "lot_size_area": optionalNumber,
  "lot_size_dimensions": optionalString,
  "map_coordinates": optionalString,
  "number_of_pets_allowed": optionalNumber,
  "number_of_units": optionalNumber,
  "pets_yn": optionalBoolean,
  "photo_count": optionalNumber,
  "room_count": optionalNumber,
  "subdivided_yn": optionalBoolean,
  "surface_rights": optionalString,
  "unit_count": optionalNumber,
  "year_built_details": optionalString,
  "zoning": optionalString,
  "security_system_yn": optionalBoolean,
  "deleted_at": optionalNumber,
  "address": address,
  "extra_features": optionalString
};
