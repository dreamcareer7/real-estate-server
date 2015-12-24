var db            = require('../utils/db.js');
var validator     = require('../utils/validator.js');

var sql_insert      = require('../sql/open_house/insert.sql');

OpenHouse = {};

// CREATE TABLE IF NOT EXISTS open_houses (
//   id uuid DEFAULT uuid_generate_v1(),
//   start_time text,
//   end_time text,
//   date TIMESTAMPTZ,
//   description TEXT,
//   listing_mui integer,
//   refreshments TEXT,
//   type text,
//   matrix_unique_id integer
// )

var schema = {
  type:'object',
  properties: {
    listing_mui: {
      required:true,
      type:'number',
    },

    description: {
      required:false,
      type:'string',
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    },

    start_time: {
      type: 'string',
      required: true
    },

    end_time: {
      type: 'string',
      required: true
    },

    refreshments: {
      type: 'string',
    },

    type: {
      type: 'string',
      required: true
    }
  }
}

var validate = validator.bind(null, schema);

OpenHouse.create = function(openhouse, cb) {
  validate(openhouse, function(err) {
    if(err)
      return cb(err);

    db.query(sql_insert, [
      openhouse.start_time,
      openhouse.end_time,
      openhouse.description,
      openhouse.listing_mui,
      openhouse.refreshments,
      openhouse.type,
      openhouse.matrix_unique_id
    ], cb);
  });
}

module.exports = function(){};