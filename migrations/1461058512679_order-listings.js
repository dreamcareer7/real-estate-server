'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const fn = fs.readFileSync('./lib/sql/listing/order_listings.fn.sql').toString()

const up = [
  'BEGIN',
  fn,
  'CREATE INDEX listings_filters_status_order ON listings_filters(order_listings(status))',
  'COMMIT'
]

const down = [
  'DROP FUNCTION order_listings(listing_status) CASCADE;'
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
