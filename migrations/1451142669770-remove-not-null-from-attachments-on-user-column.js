'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE attachments ALTER COLUMN "user" DROP not null;'
const sql_down = 'ALTER TABLE attachments ALTER COLUMN "user" SET not null;'

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
