'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'ALTER TABLE photos ADD   deleted_at     timestamp with time zone',
  'ALTER TABLE listings ADD photos_checked_at timestamp with time zone',
];

var down = [
  'ALTER TABLE photos   DROP COLUMN deleted_at',
  'ALTER TABLE listings DROP COLUMN photos_checked_at'
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
