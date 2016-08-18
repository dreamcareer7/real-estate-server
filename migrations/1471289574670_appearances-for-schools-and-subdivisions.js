'use strict';

var async = require('async');
var db = require('../lib/utils/db');
var fs = require('fs');
var schools = fs.readFileSync('./lib/sql/school/schools.mv.sql').toString();
var subdivisions = fs.readFileSync('./lib/sql/listing/subdivision/subdivisions.mv.sql').toString();

var up = [
  'DROP MATERIALIZED VIEW schools',
  schools,
  'DROP MATERIALIZED VIEW subdivisions',
  subdivisions
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
