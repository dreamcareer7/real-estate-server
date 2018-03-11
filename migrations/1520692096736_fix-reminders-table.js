'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE reminders DROP time',
  'ALTER TABLE reminders ALTER COLUMN updated_at SET DEFAULT now()',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE reminders ADD COLUMN time integer',
  'ALTER TABLE reminders ALTER COLUMN updated_at DROP DEFAULT',
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
