'use strict'

const db = require('../lib/utils/db')

const sql_up = ' CREATE TABLE raw_listings ( id uuid DEFAULT uuid_generate_v1(), \
  created_at timestamp with time zone DEFAULT NOW(), listing jsonb )'

const sql_down = 'DROP TABLE IF EXISTS raw_listings'

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
