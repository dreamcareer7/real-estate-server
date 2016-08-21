'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'ALTER TABLE alerts ADD offices text[]',
  'ALTER TABLE alerts ADD agents text[]',
  'ALTER TABLE alerts ADD high_schools text[]',
];

var down = [
  'ALTER TABLE alerts DROP offices',
  'ALTER TABLE alerts DROP agents',
  'ALTER TABLE alerts DROP high_schools'
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
