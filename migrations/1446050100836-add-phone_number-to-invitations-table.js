'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'DO $$ BEGIN ALTER TABLE invitation_records ADD COLUMN phone_number TEXT; EXCEPTION WHEN duplicate_column THEN END; $$;';
var sql_down = 'ALTER TABLE invitation_records DROP COLUMN phone_number;';

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
