'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `CREATE TABLE stripe_customers (
    id uuid NOT NULL DEFAULT uuid_generate_v1() PRIMARY KEY,
    "owner" uuid NOT NULL REFERENCES users(id),
    customer_id TEXT NOT NULL,
    source JSONB NOT NULL
  )`
]

const down = [
  'DROP TABLE stripe_customers'
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
