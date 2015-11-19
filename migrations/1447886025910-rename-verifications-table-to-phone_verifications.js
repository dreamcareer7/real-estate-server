'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE IF EXISTS verifications RENAME TO phone_verifications;';
var sql_down = 'ALTER TABLE IF EXISTS phone_verifications RENAME TO verifications;';

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
