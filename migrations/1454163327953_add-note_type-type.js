'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = ['CREATE TYPE note_types AS ENUM (\'Transaction\');'];

var down = ['DROP TYPE note_types'];

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
