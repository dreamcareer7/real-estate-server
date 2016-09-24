'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE photos ADD exif jsonb'
const sql_down = 'ALTER TABLE photos DROP COLUMN exif;'

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
