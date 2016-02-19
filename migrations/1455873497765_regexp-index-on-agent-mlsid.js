'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  "CREATE INDEX ON agents (regexp_replace(mlsid, '^0*', '', 'g'))",
];

var down = [
  'DROP INDEX agents_regexp_replace_idx'
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
