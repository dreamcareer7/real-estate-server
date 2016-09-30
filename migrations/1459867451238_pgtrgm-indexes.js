'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE EXTENSION pg_trgm',
  'CREATE INDEX listings_filters_address_trgm ON listings_filters USING gin (address gin_trgm_ops)'
]

const down = [
  'DROP EXTENSION pg_trgm CASCADE'
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
