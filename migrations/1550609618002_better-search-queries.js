'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const fn = fs.readFileSync(`${__dirname}/../lib/sql/listing/string_search.fn.sql`, 'UTF-8')

const up = [
  'BEGIN',
  'DROP FUNCTION search_listings(text)',
  'DROP INDEX listings_filters_address_trgm',
  fn,
  'COMMIT'
]

const down = []

const runAll = (sqls, next) => {
  db.conn((err, client, release) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      release()
      next(err)
    })
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
