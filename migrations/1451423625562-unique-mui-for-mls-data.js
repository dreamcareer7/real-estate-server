'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'CREATE UNIQUE INDEX IF NOT EXISTS mls_data_matrux_unique_id_idx on mls_data(matrix_unique_id)'
]

var down = [
  'DROP INDEX IF EXISTS mls_data_matrux_unique_id_idx'
]

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
  }
}

exports.up = run(up)
exports.down = run(down)
