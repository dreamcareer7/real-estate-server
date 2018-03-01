'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE INDEX deals_brand ON deals(brand)',
  'CREATE INDEX deals_listing ON deals(listing)'
]

const down = [
  'DROP INDEX deals_brand',
  'DROP INDEX deals_listing'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      client.release()
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
