'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'DROP INDEX IF EXISTS listings_mls_area_major_idx',
  'DROP INDEX IF EXISTS listings_mls_area_minor_idx',
  'DROP INDEX IF EXISTS listings_price_idx',
  'DROP INDEX IF EXISTS properties_lot_square_meters_idx',
  'DROP INDEX IF EXISTS properties_full_bathroom_count_idx',
  'DROP INDEX IF EXISTS properties_half_bathroom_count_idx',
  'DROP INDEX IF EXISTS properties_property_type_idx',
  'DROP INDEX IF EXISTS properties_bedroom_count_idx',
  'DROP INDEX IF EXISTS listings_close_date_idx',
  'DROP INDEX IF EXISTS properties_pool_yn_idx',
  'COMMIT'
]

const down = []

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
