var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var sql_insert = require('../sql/unit/insert.sql');
var sql_update = require('../sql/unit/update.sql');
var sql_get_mui = require('../sql/unit/get_mui.sql');

Unit = {};

var schema = {
  type: 'object',
  properties: {
    dining_length: {
      type: 'number'
    },
    dining_width: {
      type: 'number'
    },
    kitchen_length: {
      type: 'number'
    },
    kitchen_width: {
      type: 'number'
    },
    lease: {
      type: 'number'
    },
    listing_mui: {
      type: 'number'
    },
    living_length: {
      type: 'number'
    },
    living_width: {
      type: 'number'
    },
    master_length: {
      type: 'number'
    },
    master_width: {
      type: 'number'
    },
    matrix_unique_id: {
      type: 'number',
      required: true
    },
    matrix_modified_dt: {
      type: 'string'
    },
    full_bath: {
      type: 'number'
    },
    half_bath: {
      type: 'number'
    },
    beds: {
      type: 'number'
    },
    units: {
      type: 'number'
    },
    square_meters: {
      type: 'number'
    }
  }
};

var validate = validator.bind(null, schema);

Unit.create = function (unit, cb) {
  validate(unit, function (err) {
    if (err)
      return cb(err);

    db.query(sql_insert, [
      unit.dining_length,
      unit.dining_width,
      unit.kitchen_length,
      unit.kitchen_width,
      unit.lease,
      unit.listing,
      unit.listing_mui,
      unit.living_length,
      unit.living_width,
      unit.master_length,
      unit.master_width,
      unit.matrix_unique_id,
      unit.matrix_modified_dt,
      unit.full_bath,
      unit.half_bath,
      unit.beds,
      unit.units,
      unit.square_meters
    ], cb);
  });
};

Unit.update = function (id, unit, cb) {
  db.query(sql_update, [
    unit.dining_length,
    unit.dining_width,
    unit.kitchen_length,
    unit.kitchen_width,
    unit.lease,
    unit.listing,
    unit.listing_mui,
    unit.living_length,
    unit.living_width,
    unit.master_length,
    unit.master_width,
    unit.matrix_unique_id,
    unit.matrix_modified_dt,
    unit.full_bath,
    unit.half_bath,
    unit.beds,
    unit.units,
    unit.square_meters,
    id
  ], cb);
};

Unit.getByMUI = function (id, cb) {
  db.query(sql_get_mui, [id], function (err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Unit not found.'));

    return cb(null, res.rows[0].id);
  });
};

module.exports = function () {
};
