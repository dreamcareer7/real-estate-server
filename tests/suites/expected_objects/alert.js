var user = require('./user.js');
var v = require('../../../lib/utils/response_validation.js');

module.exports = {
  "id": String,
  "currency": String,
  "minimum_price": Number,
  "maximum_price": Number,
  "minimum_square_meters": Number,
  "maximum_square_meters": Number,
  "created_by": user,
  "created_at": Number,
  "updated_at": Number,
  "location": {
    "longitude": Number,
    "latitude": Number,
    "type": "location"
  },
  "room": String,
  "minimum_bedrooms": Number,
  "minimum_bathrooms": Number,
  "cover_image_url": v.optionalString,
  "property_type": String,
  "property_subtypes": Array,
  "points": [
    {
      "longitude": Number,
      "latitude": Number,
      "type": "location"
    },
    {
      "longitude": Number,
      "latitude": Number,
      "type": "location"
    },
    {
      "longitude": Number,
      "latitude": Number,
      "type": "location"
    },
    {
      "longitude": Number,
      "latitude": Number,
      "type": "location"
    },
    {
      "longitude": Number,
      "latitude": Number,
      "type": "location"
    }
  ],
  "horizontal_distance": Number,
  "vertical_distance": Number,
  "minimum_year_built": Number,
  "pool": v.optionalBoolean,
  "title": String,
  "minimum_lot_square_meters": Number,
  "maximum_lot_square_meters": Number,
  "maximum_year_built": Number,
  "dom": v.optionalNumber,
  "cdom": v.optionalNumber,
  "deleted_at": v.optionalNumber,
  "type": "alert",
  "users":v.optionalArray //Null or Array are both objects
};