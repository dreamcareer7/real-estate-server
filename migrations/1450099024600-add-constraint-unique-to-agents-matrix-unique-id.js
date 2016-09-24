'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE agents ADD UNIQUE (matrix_unique_id)'
const sql_down = 'ALTER TABLE contacts_tags DROP CONSTRAINT agents_matrix_unique_id_key'

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
