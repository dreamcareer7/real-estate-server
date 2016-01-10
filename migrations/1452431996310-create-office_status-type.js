'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = ['CREATE TYPE office_status AS ENUM (\'N\',\'Deceased\', \'\', \'Terminated\', \'Active\', \'Inactive\');'];

var down = ['DROP TYPE office_status'];

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
