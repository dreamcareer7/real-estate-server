'use strict'

const db = require('../lib/utils/db')

const sql_up = 'DO $$ BEGIN ALTER TABLE contacts ADD COLUMN deleted_at timestamptz; EXCEPTION WHEN duplicate_column THEN END; $$;'
const sql_down = 'ALTER TABLE contacts DROP COLUMN deleted_at'

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
