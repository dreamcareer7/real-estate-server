'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'CREATE EXTENSION pg_trgm',
  'CREATE INDEX listings_filters_address_trgm ON listings_filters USING gin (address gin_trgm_ops)'
];

var down = [
  'DROP EXTENSION pg_trgm CASCADE'
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
