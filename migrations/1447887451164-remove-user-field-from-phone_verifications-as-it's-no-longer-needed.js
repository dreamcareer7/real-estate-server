'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE IF EXISTS phone_verifications DROP COLUMN IF EXISTS "user";'
const sql_down = 'ALTER TABLE IF EXISTS phone_verifications ADD "user" uuid REFERENCES users(id);'

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
