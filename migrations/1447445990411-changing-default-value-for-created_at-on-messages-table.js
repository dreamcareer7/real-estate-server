'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE messages ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP();';
var sql_down = 'ALTER TABLE messages ALTER COLUMN created_at SET DEFAULT NOW();';

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
