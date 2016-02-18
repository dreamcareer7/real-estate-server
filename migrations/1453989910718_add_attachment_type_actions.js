'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'ALTER TYPE notification_action ADD VALUE IF NOT EXISTS \'Attached\';',
  'ALTER TYPE notification_action ADD VALUE IF NOT EXISTS \'Detached\';',
  'ALTER TYPE notification_object_class ADD VALUE IF NOT EXISTS \'Attachment\';'
];

var down = [
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
