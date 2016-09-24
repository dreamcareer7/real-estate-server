'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE UNIQUE INDEX IF NOT EXISTS google_tokens_user_idx on google_tokens("user");'
const sql_down = 'DROP INDEX IF EXISTS google_tokens_user_idx;'

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
