'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'BEGIN',
  'UPDATE tasks SET private = false WHERE private IS NULL;',
  'ALTER TABLE tasks ALTER COLUMN private SET NOT NULL;',
  'COMMIT'
];

var down = [
  'BEGIN',
  'ALTER TABLE tasks ALTER COLUMN private DROP NOT NULL;',
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
