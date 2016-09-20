'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
   "ALTER TABLE users ALTER timezone SET DEFAULT 'America/Chicago'",
   "UPDATE users SET timezone = 'America/Chicago' WHERE timezone = 'CST'"
];

var down = [
  "ALTER TABLE users ALTER timezone SET DEFAULT 'CST'"
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
