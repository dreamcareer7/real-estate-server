'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const mv = require('fs').readFileSync(__dirname + '/../lib/sql/alert/listings_filters.mv.sql').toString()

const up = [
  'BEGIN',
  'DROP MATERIALIZED VIEW listings_filters',
  mv,
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
