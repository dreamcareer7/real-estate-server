'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE INDEX IF NOT EXISTS addresses_location_gix ON addresses USING gist(location);'
const sql_down = 'DROP INDEX addresses_location_gix;'

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
