'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE INDEX notifications_specific ON notifications(specific)'
]

const down = [
  'DROP INDEX notifications_specific'
]

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
