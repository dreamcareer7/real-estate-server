var user = require('./user.js');

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
  "cover_image_url": function(val) { expect(val).toBeTypeOrNull(String); },
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
  "pool": null,
  "title": String,
  "minimum_lot_square_meters": Number,
  "maximum_lot_square_meters": Number,
  "maximum_year_built": Number,
  "dom": null,
  "cdom": null,
  "deleted_at": function(val) { expect(val).toBeTypeOrNull(Number); },
  "type": "alert"
};