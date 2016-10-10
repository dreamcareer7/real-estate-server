'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE INDEX ON photos (listing_mui)'
const sql_down = 'DROP INDEX photos_listing_mui_idx'

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
