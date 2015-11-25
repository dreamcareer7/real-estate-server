'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE IF EXISTS phone_verifications DROP COLUMN IF EXISTS "user";';
var sql_down = 'ALTER TABLE IF EXISTS phone_verifications ADD "user" uuid REFERENCES users(id);';

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
