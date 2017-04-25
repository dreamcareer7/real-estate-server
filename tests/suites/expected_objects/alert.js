const user = require('./user.js')
const v = require('./validation.js')

module.exports = {
  'id': String,
  'minimum_price': v.optionalNumber,
  'maximum_price': v.optionalNumber,
  'minimum_square_meters': v.optionalNumber,
  'maximum_square_meters': v.optionalNumber,
  'created_by': user,
  'created_at': v.optionalNumber,
  'updated_at': v.optionalNumber,
  'room': String,
  'minimum_bedrooms': v.optionalNumber,
  'minimum_bathrooms': v.optionalNumber,
  'property_types': v.optionalArray,
  'property_subtypes': v.optionalArray,
  'points': [
    {
      'longitude': Number,
      'latitude': Number,
      'type': 'location'
    },
    {
      'longitude': Number,
      'latitude': Number,
      'type': 'location'
    },
    {
      'longitude': Number,
      'latitude': Number,
      'type': 'location'
    },
    {
      'longitude': Number,
      'latitude': Number,
      'type': 'location'
    },
    {
      'longitude': Number,
      'latitude': Number,
      'type': 'location'
    }
  ],
  'minimum_year_built': v.optionalNumber,
  'pool': v.optionalBoolean,
  'pets': v.optionalBoolean,
  'title': v.optionalString,
  'proposed_title': String,
  'minimum_lot_square_meters': v.optionalNumber,
  'maximum_lot_square_meters': v.optionalNumber,
  'maximum_year_built': v.optionalNumber,
  'deleted_at': v.optionalNumber,
  'type': 'alert',
  'users': v.optionalArray // Null or Array are both objects
}
