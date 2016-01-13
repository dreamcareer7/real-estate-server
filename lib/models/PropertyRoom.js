var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var sql_insert = require('../sql/property_room/insert.sql');
var sql_update = require('../sql/property_room/update.sql');
var sql_get_mui = require('../sql/property_room/get_mui.sql');

PropertyRoom = {};

var schema = {
  type: 'object',
  properties: {
    matrix_unique_id: {
      type: 'number'
    },
    matrix_modified_dt: {
      type: 'string'
    },
    description: {
      type: 'string'
    },
    length: {
      type: 'number'
    },
    width: {
      type: 'number'
    },
    features: {
      type: 'string'
    },
    listing_mui: {
      type: 'number'
    },
    level: {
      type: 'number'
    },
    type: {
      type: 'string'
    }
  }
};

var validate = validator.bind(null, schema);

PropertyRoom.create = function (property_room, cb) {
  validate(property_room, function (err) {
    if (err)
      return cb(err);

    db.query(sql_insert, [
      property_room.matrix_unique_id,
      property_room.matrix_modified_dt,
      property_room.description,
      property_room.length,
      property_room.width,
      property_room.features,
      property_room.listing_mui,
      property_room.listing,
      property_room.level,
      property_room.type
    ], cb);
  });
};

PropertyRoom.update = function (id, property_room, cb) {
  db.query(sql_update, [
    property_room.matrix_unique_id,
    property_room.matrix_modified_dt,
    property_room.description,
    property_room.length,
    property_room.width,
    property_room.features,
    property_room.listing_mui,
    property_room.listing,
    property_room.level,
    property_room.type,
    id
  ], cb);
};

PropertyRoom.getByMUI = function (id, cb) {
  db.query(sql_get_mui, [id], function (err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Room not found.'));

    return cb(null, res.rows[0].id);
  });
};

module.exports = function () {
};
