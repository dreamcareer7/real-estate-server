'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE transaction_contacts ADD UNIQUE(transaction, contact);';
var sql_down = 'ALTER TABLE transaction_contacts DROP CONSTRAINT transaction_contacts_transaction_contact_key;';

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
