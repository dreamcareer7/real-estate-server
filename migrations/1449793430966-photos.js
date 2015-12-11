'use strict';

var db = require('../lib/utils/db');

var sql_up = 'CREATE TABLE IF NOT EXISTS photos\
(\
  id uuid DEFAULT uuid_generate_v1(),\
  created_at timestamptz DEFAULT NOW(),\
  last_processed timestamptz,\
  error text,\
  matrix_unique_id integer NOT NULL UNIQUE,\
  listing_mui integer NOT NULL,\
  description text,\
  url text,\
  "order" int\
);';

var sql_down = 'DROP TABLE IF EXISTS photos';

var runSql = (sql) => {
  return (next) => {
    db.conn( (err, client) => {
      if(err)
        return next(err);

      return client.query(sql, next);
    });
  };
};

exports.up = runSql(sql_up);
exports.down = runSql(sql_down);
