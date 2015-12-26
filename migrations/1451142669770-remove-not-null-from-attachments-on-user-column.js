'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE attachments ALTER COLUMN "user" DROP not null;';
var sql_down = 'ALTER TABLE attachments ALTER COLUMN "user" SET not null;';

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
