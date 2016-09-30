'use strict'

const db = require('../lib/utils/db')

const sql_up = 'DO $$ BEGIN ALTER TABLE users ADD COLUMN phone_confirmed boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN END; $$;'
const sql_down = 'ALTER TABLE users DROP COLUMN phone_confirmed;'

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
