'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `CREATE TABLE stripe_charges (
    id uuid DEFAUlT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    "user" uuid NOT NULL REFERENCES users(id),
    "customer" uuid NOT NULL REFERENCES stripe_customers(id),
    amount INT,
    charge JSONB
  )`
]

const down = [
  'DROP TABLE stripe_charges'
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
