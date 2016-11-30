'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `CREATE TABLE godaddy_shoppers (
    id uuid NOT NUlL DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    "user" uuid NOT NUlL REFERENCES users(id),
    shopper_id text
  )`,
  'ALTER TABLE godaddy_shoppers ADD CONSTRAINT unique_user UNIQUE("user")'
]

const down = [
  'DROP TABLE godaddy_shoppers'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), next)
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
