'use strict';

var async = require('async');
var db = require('../lib/utils/db');
var fs = require('fs');
var areas   = fs.readFileSync('./lib/sql/listing/area/mls_areas.mv.sql').toString();

var up = [
  'DROP MATERIALIZED VIEW mls_areas',
  areas
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
