'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE TABLE agents (\
  id uuid NOT NULL DEFAULT uuid_generate_v1(),\
  email text NOT NULL,\
  mlsid text NOT NULL,\
  fax   text,\
  full_name text,\
  first_name text,\
  last_name text,\
  middle_name   text,\
  phone_number text,\
  nar_number text,\
  office_mui integer,\
  status text,\
  office_mlsid text,\
  work_phone text,\
  generational_name text,\
  matrix_unique_id integer NOT NULL,\
  matrix_modified_dt timestamptz\
)';
var sql_down = 'DROP TABLE IF EXISTS agents';

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
