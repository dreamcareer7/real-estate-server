'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE TABLE IF NOT EXISTS transaction_contacts (id uuid default uuid_generate_v4() PRIMARY KEY, \
transaction uuid not null REFERENCES transactions(id), \
contact uuid not null REFERENCES contacts(id));'
const sql_down = 'DROP TABLE transaction_contacts;'

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
