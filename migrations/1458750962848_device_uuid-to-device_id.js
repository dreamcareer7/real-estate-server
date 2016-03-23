'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'BEGIN',
  'ALTER TABLE sessions ALTER COLUMN device_uuid TYPE char varying(255)',
  'ALTER TABLE sessions RENAME COLUMN device_uuid TO device_id',
  'COMMIT'
];

var down = [
  'BEGIN',
  'ALTER TABLE sessions RENAME COLUMN device_id TO device_uuid',
  'ALTER TABLE sessions ALTER COLUMN device_uuid TYPE uuid USING device_uuid::uuid;',
  'COMMIT'
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
