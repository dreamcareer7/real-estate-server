const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const sql_insert = require('../sql/property_room/insert.sql')
const sql_get_mui = require('../sql/property_room/get_mui.sql')

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

    db.query(sql_insert, [
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

PropertyRoom.getByMUI = function (id, cb) {
  db.query(sql_get_mui, [id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Room not found.'))

    return cb(null, res.rows[0].id)
  })
}

module.exports = function () {
}
