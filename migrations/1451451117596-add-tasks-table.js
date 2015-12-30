'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
'CREATE TABLE IF NOT EXISTS tasks(id uuid DEFAULT uuid_generate_v1() PRIMARY KEY, \
"user" uuid NOT NULL REFERENCES users(id), \
title text, \
due_date timestamptz, \
status task_status NOT NULL DEFAULT \'New\', \
"transaction" uuid REFERENCES transactions(id), \
created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW(), deleted_at timestamptz);'
];

var down = [
  'DROP TABLE IF EXISTS tasks'
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
