'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE UNIQUE INDEX IF NOT EXISTS transaction_contact_roles_transaction_contact_roles_idx on transaction_contact_roles(transaction_contact, role);';
var sql_down = 'DROP INDEX IF EXISTS transaction_contact_roles_transaction_contact_roles_idx;';

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
