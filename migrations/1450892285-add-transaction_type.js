'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE TYPE transaction_type AS ENUM (\'Buyer\', \'Seller\', \'Buyer/Seller\', \'Lease\');';
var sql_down = 'DROP TYPE transaction_type;';

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
