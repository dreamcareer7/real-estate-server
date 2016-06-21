'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'CREATE TABLE brands (id uuid DEFAULT uuid_generate_v1() PRIMARY KEY, created_at timestamp with time zone DEFAULT NOW(), updated_at timestamp with time zone DEFAULT NOW(), title text, subdomain text, logo_url text, palette jsonb )'
];

var down = [
  'DROP TABLE brands'
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
