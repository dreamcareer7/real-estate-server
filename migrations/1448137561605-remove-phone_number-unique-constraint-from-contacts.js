'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_user_phone_number_key;';
var sql_down = 'ALTER TABLE contacts ADD UNIQUE("user", phone_number);';

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
