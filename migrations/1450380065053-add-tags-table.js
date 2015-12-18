'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE TABLE IF NOT EXISTS tags(\
  id uuid NOT NULL DEFAULT uuid_generate_v4(),\
  entity uuid NOT NULL,\
  tag character varying NOT NULL,\
  type tag_types,\
  created_at timestamp with time zone DEFAULT now());';

var sql_down = 'DROP TABLE IF EXISTS tags;';

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
