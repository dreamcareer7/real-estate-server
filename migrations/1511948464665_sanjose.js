'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'DO SOMETHING',
  'DO SOMETHING ELSE',
  'EVEN DO MORE',
  'COMMIT'
]

const down = [
  'BEGIN',
  'UNDO SOMETHING',
  'UNDO SOMETHING ELSE',
  'UNDO EVEN MORE',
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
