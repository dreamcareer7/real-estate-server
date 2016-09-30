'use strict'

const db = require('../lib/utils/db')

const sql_up = 'DO $$ BEGIN ALTER TABLE agents ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN END; $$;'
const sql_down = 'ALTER TABLE IF EXISTS agents DROP COLUMN IF EXISTS created_at'

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
