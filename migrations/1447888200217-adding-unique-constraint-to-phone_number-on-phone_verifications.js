'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE UNIQUE INDEX IF NOT EXISTS phone_verifications_phone_number on phone_verifications(phone_number);'
const sql_down = 'DROP INDEX IF EXISTS phone_verifications_phone_number;'

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
