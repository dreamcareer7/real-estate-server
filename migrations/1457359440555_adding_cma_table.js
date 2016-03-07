'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'CREATE TABLE cmas (id uuid NOT NULL DEFAULT uuid_generate_v4(), \
"user" uuid NOT NULL REFERENCES users(id), \
room uuid NOT NULL REFERENCES rooms(id), \
suggested_price float NOT NULL, \
comment text, listings text[] NOT NULL, \
created_at timestamptz DEFAULT NOW(), \
updated_at timestamptz DEFAULT NOW(), \
deleted_at timestamptz);'
];

var down = [
  'DROP TABLE cmas;'
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
