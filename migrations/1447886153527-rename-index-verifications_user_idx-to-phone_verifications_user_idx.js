'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER INDEX IF EXISTS verifications_user_idx RENAME TO phone_verifications_user_idx;';
var sql_down = 'ALTER INDEX IF EXISTS phone_verifications_user_idx RENAME TO verifications_user_idx;';

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
