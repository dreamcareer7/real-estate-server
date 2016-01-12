'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE UNIQUE INDEX IF NOT EXISTS units_mui_idx on units(matrix_unique_id);';
var sql_down = 'DROP INDEX IF EXISTS units_mui_idx;';

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
