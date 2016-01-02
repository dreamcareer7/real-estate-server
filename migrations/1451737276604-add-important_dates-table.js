'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
'CREATE TABLE IF NOT EXISTS important_dates(id uuid DEFAULT uuid_generate_v1() PRIMARY KEY, \
title text NOT NULL, \
"transaction" uuid NOT NULL REFERENCES transactions(id), \
due_date timestamptz, \
created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW(), deleted_at timestamptz);'
];

var down = [
  'DROP TABLE IF EXISTS important_dates'
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
