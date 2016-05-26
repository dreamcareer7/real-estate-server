'use strict';

var async = require('async');
var db = require('../lib/utils/db');
var fs = require('fs');
var emails = fs.readFileSync('./lib/sql/agent/agents_emails.mv.sql').toString();

var up = [
  'DROP MATERIALIZED VIEW agents_emails',
  emails
];

var down = [];

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
