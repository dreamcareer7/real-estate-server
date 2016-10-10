'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE TABLE IF NOT EXISTS tags(\
  id uuid DEFAULT uuid_generate_v1(),\
  name character varying(100));'

const sql_down = 'DROP TABLE IF EXISTS tags;'

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
