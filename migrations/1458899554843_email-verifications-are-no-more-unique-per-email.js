'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'BEGIN',
  'DROP INDEX email_verifications_email_idx',
  'COMMIT'
];

var down = [
  'BEGIN',
  'CREATE UNIQUE INDEX email_verifications_email_idx ON email_verifications (email)',
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
