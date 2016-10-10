'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE IF EXISTS phone_verifications RENAME CONSTRAINT verification_user_fkey TO phone_verifications_user_fkey;'
const sql_down = 'ALTER TABLE IF EXISTS phone_verifications RENAME CONSTRAINT phone_verifications_user_fkey TO verification_user_fkey;'

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
