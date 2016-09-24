'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TYPE notification_object_class ADD VALUE \'Invitation\';'
const sql_down = 'SELECT NOW();'

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
