'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE agents ADD CONSTRAINT agents_pkey PRIMARY KEY(id);'
const sql_down = 'ALTER TABLE agents DROP CONSTRAINT agents_pkey;'

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
