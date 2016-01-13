'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'UPDATE alerts SET open_house = FALSE;',
  'ALTER TABLE alerts ALTER COLUMN open_house SET NOT NULL;',
];

var down = [
  'ALTER TABLE alerts ALTER COLUMN open_house DROP NOT NULL;',
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
