'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE stripe_customers ADD created_at timestamp with time zone DEFAULT NOW()',
  'ALTER TABLE stripe_customers ADD updated_at timestamp with time zone DEFAULT NOW()',
  'ALTER TABLE stripe_customers ADD deleted_at timestamp with time zone',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE stripe_customers DROP created_at',
  'ALTER TABLE stripe_customers DROP updated_at',
  'ALTER TABLE stripe_customers DROP deleted_at',
  'COMMIT'
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
