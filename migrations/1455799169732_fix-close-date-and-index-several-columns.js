'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'ALTER TABLE listings ALTER COLUMN close_date SET DATA TYPE timestamptz USING CASE WHEN LENGTH(close_date) < 1 THEN NULL ELSE close_date::timestamptz END',
  'CREATE INDEX ON listings (close_date)',
  'CREATE INDEX ON listings (list_date)',
  'CREATE INDEX ON listings (mls_area_major)',
  'CREATE INDEX ON listings (mls_area_minor)',
];

var down = [
  'ALTER TABLE listings ALTER COLUMN close_date SET DATA TYPE text',
  'DROP INDEX listings_list_date_idx',
  'DROP INDEX listings_close_date_idx',
  'DROP INDEX listings_mls_area_major_idx',
  'DROP INDEX listings_mls_area_minor_idx'
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
