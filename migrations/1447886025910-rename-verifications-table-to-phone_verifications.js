'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE IF EXISTS verifications RENAME TO phone_verifications;'
const sql_down = 'ALTER TABLE IF EXISTS phone_verifications RENAME TO verifications;'

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
