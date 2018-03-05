'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE reminders RENAME COLUMN relative_time TO is_relative',
  'ALTER TABLE reminders ADD notification uuid REFERENCES notifications(id)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE reminders RENAME COLUMN is_relative TO relative_time',
  'ALTER TABLE reminders DROP notification',
  'COMMIT'
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
