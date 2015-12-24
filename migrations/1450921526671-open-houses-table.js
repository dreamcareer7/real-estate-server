'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var create = 'CREATE TABLE IF NOT EXISTS open_houses (\
  id uuid DEFAULT uuid_generate_v1(),\
  start_time TIMESTAMP,\
  end_time TIMESTAMP,\
  description TEXT,\
  listing_mui integer,\
  refreshments TEXT,\
  type text,\
  matrix_unique_id integer UNIQUE,\
  created_at TIMESTAMPTZ DEFAULT NOW(),\
  updated_at TIMESTAMPTZ DEFAULT NOW(),\
  deleted_at TIMESTAMPTZ\
)';
var index = 'CREATE INDEX ON open_houses (listing_mui)'

var drop = 'DROP TABLE open_houses';


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
  }
}

exports.up = run([create, index])
exports.down = run([drop])
