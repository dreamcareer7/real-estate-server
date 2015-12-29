'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE photos ADD exif jsonb';
var sql_down = 'ALTER TABLE photos DROP COLUMN exif;';

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
