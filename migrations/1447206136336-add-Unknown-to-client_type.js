'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TYPE client_type ADD VALUE IF NOT EXISTS \'Unknown\''
// There is no trivial way to downgrade
const sql_down = ''

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
