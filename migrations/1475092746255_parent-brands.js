'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'CREATE TABLE brands_parents ( id uuid NOT NULL DEFAULT uuid_generate_v1(),brand uuid NOT NULL UNIQUE REFERENCES brands(id), parent uuid NOT NULL REFERENCES brands(id))'
];

var down = [
  'DROP TABLE brands_parents'
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
