'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE UNIQUE INDEX IF NOT EXISTS phone_verifications_phone_number on phone_verifications(phone_number);';
var sql_down = 'DROP INDEX IF EXISTS phone_verifications_phone_number;';

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
