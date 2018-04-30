'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'CREATE INDEX IF NOT EXISTS tasks_submission_idx ON tasks (submission)',
  'CREATE INDEX IF NOT EXISTS deal_context_key_idx ON deal_context (key)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP INDEX tasks_submission_idx',
  'DROP INDEX deal_context_key_idx',
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
