'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE reminders DROP CONSTRAINT reminders_task_fkey',
  'ALTER TABLE reminders ADD CONSTRAINT "reminders_task_fkey" FOREIGN KEY (task) REFERENCES crm_tasks(id)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE reminders DROP CONSTRAINT reminders_task_fkey',
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
