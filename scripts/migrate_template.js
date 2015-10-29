'use strict'

var db = require('../lib/utils/db');

var sql_up   = 'SOME SQL TO DO';
var sql_down = 'SOME SQL TO UNDO';

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
