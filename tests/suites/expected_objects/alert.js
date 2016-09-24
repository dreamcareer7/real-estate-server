const user = require('./user.js')
const v = require('./validation.js')

module.exports = {
  'id': String,
  'minimum_price': Number,
  'maximum_price': Number,
  'minimum_square_meters': Number,
  'maximum_square_meters': Number,
  'created_by': user,
  'created_at': Number,
  'updated_at': Number,
  'room': String,
  'minimum_bedrooms': Number,
  'minimum_bathrooms': Number,
  'property_types': Array,
  'property_subtypes': Array,
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
  'minimum_year_built': Number,
  'pool': v.optionalBoolean,
  'title': v.optionalString,
  'proposed_title': String,
  'minimum_lot_square_meters': Number,
  'maximum_lot_square_meters': Number,
  'maximum_year_built': Number,
  'deleted_at': v.optionalNumber,
  'type': 'alert',
  'users': v.optionalArray // Null or Array are both objects
}
