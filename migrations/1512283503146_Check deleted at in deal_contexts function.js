'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const deal_contexts = require('fs').readFileSync('./lib/sql/deal/deal_contexts.fn.sql').toString()

const up = [
  'BEGIN',
  deal_contexts,
  'COMMIT'
]

const down = []

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
