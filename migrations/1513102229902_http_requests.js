'use strict'

const db = require('../lib/utils/db')

const up = `CREATE TABLE IF NOT EXISTS http_requests
(
  id uuid NOT NULL PRIMARY KEY,
  method text NOT NULL,
  path VARCHAR NOT NULL,
  elapsed integer NOT NULL,
  response integer NOT NULL,
  client uuid REFERENCES clients(id),
  user_id uuid REFERENCES users(id),
  queries integer NOT NULL
)`

const down = 'DROP TABLE IF EXISTS http_requests'

const runSql = (sql) => {
  return (next) => {
    db.conn((err, client) => {
      if (err)
        return next(err)

      return client.query(sql, next)
    })
  }
}

exports.up = runSql(up)
exports.down = runSql(down)
