'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'DO $$ BEGIN ALTER TABLE contacts ADD UNIQUE("user", email); EXCEPTION WHEN duplicate_object THEN END; $$;';
var sql_down = 'ALTER TABLE contacts DROP CONSTRAINT contacts_user_email_key';

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
