'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE transaction_contact_roles ADD CONSTRAINT transaction_contact_roles_pkey PRIMARY KEY(id);';
var sql_down = 'ALTER TABLE transaction_contact_roles DROP CONSTRAINT transaction_contact_roles_pkey;';

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
