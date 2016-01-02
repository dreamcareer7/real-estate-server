'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE transaction_contact_roles \
ADD CONSTRAINT transaction_contacts_roles_transaction_contact_fkey FOREIGN KEY (transaction_contact) \
REFERENCES public.transaction_contacts (id) MATCH SIMPLE \
ON UPDATE NO ACTION ON DELETE NO ACTION';

var sql_down = 'ALTER TABLE transaction_contact_roles DROP CONSTRAINT transaction_contacts_roles_transaction_contact_fkey;';

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
