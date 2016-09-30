'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE messages ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP();'
const sql_down = 'ALTER TABLE messages ALTER COLUMN created_at SET DEFAULT NOW();'

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
