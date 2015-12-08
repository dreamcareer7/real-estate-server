'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE UNIQUE INDEX IF NOT EXISTS email_verifications_email_idx on email_verifications(email);';
var sql_down = 'DROP INDEX IF EXISTS email_verifications_email_idx;';

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
