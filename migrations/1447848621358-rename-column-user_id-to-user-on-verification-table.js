'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE verifications RENAME COLUMN "user_id" TO "user";';
var sql_down = 'ALTER TABLE verifications RENAME COLUMN "user_id" TO "user";';

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
