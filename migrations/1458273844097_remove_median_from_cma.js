'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'BEGIN',
  'ALTER TABLE cmas DROP COLUMN median_price;',
  'ALTER TABLE cmas DROP COLUMN median_dom;',
  'COMMIT'
];

var down = [
  'BEGIN',
  'ALTER TABLE cmas ADD median_price float NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD median_dom int NOT NULL DEFAULT 0;',
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
