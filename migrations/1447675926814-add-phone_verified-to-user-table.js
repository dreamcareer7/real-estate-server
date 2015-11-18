'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE users ADD COLUMN phone_confirmed boolean DEFAULT false;';
var sql_down = 'ALTER TABLE users DROP COLUMN phone_confirmed;';

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
