'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_user_email_key;'
const sql_down = 'ALTER TABLE contacts ADD UNIQUE("user", email);'

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
