'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE transaction_contacts ADD UNIQUE(transaction, contact);'
const sql_down = 'ALTER TABLE transaction_contacts DROP CONSTRAINT transaction_contacts_transaction_contact_key;'

const runSql = (sql) => {
  return (next) => {
    db.conn((err, client) => {
      if (err)
        return next(err)

      return client.query(sql, next)
    })
  }
}

exports.up = runSql(sql_up)
exports.down = runSql(sql_down)
