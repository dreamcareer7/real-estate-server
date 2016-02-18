'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'CREATE TABLE notes(\
  id uuid NOT NULL DEFAULT uuid_generate_v4(),\
  entity uuid NOT NULL,\
  \"user\" uuid NOT NULL,\
  note character varying NOT NULL,\
  type note_types,\
  created_at timestamp with time zone DEFAULT now())'
];

var down = ['DROP TABLE IF EXISTS notes;'];

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