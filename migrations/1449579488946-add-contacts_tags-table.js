'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE TABLE IF NOT EXISTS contacts_tags(\
  id uuid NOT NULL DEFAULT uuid_generate_v4(),\
  contact uuid NOT NULL,\
  tag uuid NOT NULL,\
  created_at timestamp with time zone DEFAULT now())'

const sql_down = 'DROP TABLE IF EXISTS contacts_tags'

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
