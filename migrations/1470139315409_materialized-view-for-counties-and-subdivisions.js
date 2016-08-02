'use strict';

var async = require('async');
var db = require('../lib/utils/db');
var fs = require('fs');
var counties = fs.readFileSync('./lib/sql/listing/county/counties.mv.sql').toString();
var subdivs  = fs.readFileSync('./lib/sql/listing/subdivision/subdivisions.mv.sql').toString();

var up = [
  counties,
  subdivs
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
