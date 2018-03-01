'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE INDEX recommendations_updated_at ON recommendations(updated_at)'
]

const down = [
  'DROP INDEX recommendations_updated_at'
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
