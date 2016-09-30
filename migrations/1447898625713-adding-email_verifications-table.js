'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE TABLE IF NOT EXISTS email_verifications\
(\
  id uuid DEFAULT uuid_generate_v1(),\
  code text NOT NULL,\
  created_at timestamptz DEFAULT NOW(),\
  email text\
);'

const sql_down = 'DROP TABLE IF EXISTS email_verifications'

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
