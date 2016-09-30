'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE TABLE IF NOT EXISTS attachments(id uuid default uuid_generate_v4() PRIMARY KEY, \
"user" uuid not null references users(id), url text, metadata jsonb, \
created_at timestamptz default NOW(), updated_at timestamptz default NOW(), deleted_at timestamptz);'
const sql_down = 'DROP TABLE attachments;'

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
