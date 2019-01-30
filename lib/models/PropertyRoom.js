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

const validate = validator.promise.bind(null, schema)

PropertyRoom.create = async property_room => {
  await validate(property_room)

  const res = await db.query.promise('property_room/insert', [
    property_room.matrix_unique_id,
    property_room.matrix_modified_dt,
    property_room.description,
    property_room.length,
    property_room.width,
    property_room.features,
    property_room.listing_mui,
    property_room.level,
    property_room.room_type
  ])

  return res.rows[0].id
}

module.exports = function () {}
