'use strict'

var db = require('../lib/utils/db');

var sql_up = 'DO $$ BEGIN BEGIN ALTER TABLE CONTACTS ADD COLUMN deleted_at timestamptz; EXCEPTION WHEN duplicate_column THEN RAISE NOTICE \'column deleted_at exists\'; END; END; $$;';
var sql_down = 'ALTER TABLE contacts DROP COLUMN deleted_at';

var runSql = (sql) => {
  return (next) => {
    db.conn( (err, client) => {
      if(err)
        return next(err);

      client.query(sql, next)
    })
  }
}

exports.up = runSql(sql_up);
exports.down = runSql(sql_down);
