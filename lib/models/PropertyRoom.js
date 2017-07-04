const db = require('../utils/db.js')
const validator = require('../utils/validator.js')

PropertyRoom = {}

const schema = {
  type: 'object',
  properties: {
    matrix_unique_id: {
      type: 'number'
    }
  }
}

const validate = validator.bind(null, schema)

PropertyRoom.create = function (property_room, cb) {
  validate(property_room, function (err) {
    if (err)
      return cb(err)

    db.query('property_room/insert', [
      property_room.matrix_unique_id,
      property_room.matrix_modified_dt,
      property_room.description,
      property_room.length,
      property_room.width,
      property_room.features,
      property_room.listing_mui,
      property_room.level,
      property_room.room_type
    ], cb)
  })
}

module.exports = function () {}
