'use strict';

var async = require('async');
var db = require('../lib/utils/db');
var fs = require('fs');
var listings_filters = fs.readFileSync('./lib/sql/alert/listings_filters.mv.sql').toString();

var up = [
  'DROP MATERIALIZED VIEW listings_filters',
  listings_filters,
];

var down = [];

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
