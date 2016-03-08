'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'BEGIN',
  'ALTER TABLE cmas ADD lowest_price float NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD median_price float NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD average_price float NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD highest_price float NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD lowest_dom int NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD median_dom int NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD average_dom int NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD highest_dom int NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ALTER COLUMN suggested_price DROP NOT NULL;',
  'COMMIT'
];

var down = [
  'BEGIN',
  'ALTER TABLE cmas DROP COLUMN lowest_price;',
  'ALTER TABLE cmas DROP COLUMN median_price;',
  'ALTER TABLE cmas DROP COLUMN average_price;',
  'ALTER TABLE cmas DROP COLUMN highest_price;',
  'ALTER TABLE cmas DROP COLUMN lowest_dom;',
  'ALTER TABLE cmas DROP COLUMN median_dom;',
  'ALTER TABLE cmas DROP COLUMN average_dom;',
  'ALTER TABLE cmas DROP COLUMN highest_dom;',
  'COMMIT'
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
