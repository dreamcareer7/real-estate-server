'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE crm_tasks ADD COLUMN searchable_field TEXT',
  'create index crm_tasks_trgm_idx on crm_tasks using gin (searchable_field gin_trgm_ops)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP INDEX crm_tasks_trgm_idx',
  'ALTER TABLE crm_tasks DROP COLUMN searchable_field',
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
