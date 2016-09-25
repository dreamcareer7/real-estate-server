'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const listings_filters = fs.readFileSync('./lib/sql/alert/listings_filters.mv.sql').toString()

const up = [
  'DROP MATERIALIZED VIEW listings_filters',
  'ALTER TABLE alerts ADD postal_codes text[]',
  listings_filters
]

const down = [
  'ALTER TABLE alerts DROP postal_codes'
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
