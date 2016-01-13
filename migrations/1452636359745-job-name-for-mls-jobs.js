'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'ALTER TABLE mls_jobs ADD COLUMN name TEXT',
  "UPDATE mls_jobs SET name = 'listings'    WHERE class = 'Listing'",
  "UPDATE mls_jobs SET name = 'agents'      WHERE class = 'Agent'",
  "UPDATE mls_jobs SET name = 'offices'     WHERE class = 'Office'",
  "UPDATE mls_jobs SET name = 'open_houses' WHERE class = 'OpenHouse'",
  "UPDATE mls_jobs SET name = 'photos'      WHERE class = 'Media'",
  "ALTER TABLE mls_jobs DROP class",
  "ALTER TABLE mls_jobs DROP resource"
];

var down = [
  'ALTER TABLE mls_jobs DROP name'
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
