'use strict'

const async = require('async')
const fs = require('fs')

const db = require('../lib/utils/db')

const range_contains_birthday = fs.readFileSync(__dirname + '/../lib/sql/analytics/calendar/range_contains_birthday.fn.sql')
const up = [
  'BEGIN',
  range_contains_birthday,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION range_contains_birthday(timestamptz, timestamptz, timestamptz)',
  'COMMIT'
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
