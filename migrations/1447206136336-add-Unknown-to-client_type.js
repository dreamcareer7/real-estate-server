'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TYPE client_type ADD VALUE \'Unknown\'';
// There is no trivial way to downgrade
var sql_down = '';

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
