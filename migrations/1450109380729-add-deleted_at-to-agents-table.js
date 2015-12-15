'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'DO $$ BEGIN ALTER TABLE agents ADD COLUMN deleted_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN END; $$;';
var sql_down = 'ALTER TABLE IF EXISTS agents DROP COLUMN IF EXISTS deleted_at';

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
