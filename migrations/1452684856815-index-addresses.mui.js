'use strict';

var async = require('async');
var db = require('../lib/utils/db');


var sql_up   = 'CREATE UNIQUE INDEX IF NOT EXISTS offices_mui_idx on offices(matrix_unique_id);';
var sql_down = 'DROP INDEX IF EXISTS offices_mui_idx;';

var up = [
  'CREATE UNIQUE INDEX IF NOT EXISTS addresses_matrix_unique_id_idx  on addresses(matrix_unique_id)',
  'CREATE UNIQUE INDEX IF NOT EXISTS listings_matrix_unique_id_idx   on listings(matrix_unique_id)',
  'CREATE UNIQUE INDEX IF NOT EXISTS properties_matrix_unique_id_idx on properties(matrix_unique_id)'
];

var down = [
  'DROP INDEX IF EXISTS addresses_matrix_unique_id_idx',
  'DROP INDEX IF EXISTS listings_matrix_unique_id_idx',
  'DROP INDEX IF EXISTS properties_matrix_unique_id_idx'
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
