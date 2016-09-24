'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE contacts ADD CONSTRAINT contacts_pkey PRIMARY KEY(id);'
const sql_down = 'ALTER TABLE contacts DROP CONSTRAINT contacts_pkey;'

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
