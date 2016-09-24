'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const listings_filters = fs.readFileSync('./lib/sql/alert/listings_filters.mv.sql').toString()

const up = [
  'ALTER TABLE alerts ADD COLUMN selling_offices text[]',
  'ALTER TABLE alerts ADD COLUMN selling_agents  text[]',
  'DROP MATERIALIZED VIEW listings_filters',
  listings_filters
]

const down = [
  'ALTER TABLE alerts DROP COLUMN selling_offices',
  'ALTER TABLE alerts DROP COLUMN selling_agents'
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
