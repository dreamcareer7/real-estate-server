'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'ALTER TABLE property_rooms DROP COLUMN listing',
  'ALTER TABLE property_rooms RENAME COLUMN type TO room_type',
  'ALTER TABLE units DROP COLUMN listing',
  'ALTER TABLE units RENAME COLUMN square_meters TO square_feet',
  'ALTER TABLE units RENAME TO property_units'
];

var down = [
  'ALTER TABLE property_units RENAME TO units',
  'ALTER TABLE property_rooms RENAME COLUMN room_type TO type',
  'ALTER TABLE property_rooms ADD COLUMN listing uuid',
  'ALTER TABLE units ADD COLUMN listing uuid',
  'ALTER TABLE units RENAME COLUMN square_feet TO square_meters'
];

var runAll = (sqls, next) => {
  db.conn( (err, client) => {
    if(err)
      return next(err);

    async.eachSeries(sqls, client.query.bind(client), next);
  });
};

var run = (queries) => {
  return (next) => {
    runAll(queries, next);
  };
};

exports.up = run(up);
exports.down = run(down);
