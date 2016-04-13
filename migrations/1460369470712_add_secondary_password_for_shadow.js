'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'BEGIN',
  'ALTER TABLE users ADD secondary_password text DEFAULT md5(random()::text) NOT NULL;',
  'ALTER TABLE users ADD is_shadow boolean DEFAULT false;',
  'COMMIT'
];

var down = [
  'BEGIN',
  'ALTER TABLE users DROP COLUMN is_shadow;',
  'ALTER TABLE users DROP COLUMN secondary_password;',
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
