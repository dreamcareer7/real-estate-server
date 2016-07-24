'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'ALTER TABLE offices ADD COLUMN brand uuid DEFAULT NULL REFERENCES brands(id)'
];

var down = [
  'ALTER TABLE offices DROP COLUMN brand'
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
