'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'UPDATE crm_tasks SET title = \'\' WHERE title IS NULL',
  'UPDATE crm_tasks SET task_type = \'Todo\' WHERE task_type IS NULL',
  'UPDATE crm_tasks SET due_date = now() WHERE due_date IS NULL',
  'ALTER TABLE crm_tasks ALTER COLUMN due_date SET NOT NULL',
  'ALTER TABLE crm_tasks ALTER COLUMN title SET NOT NULL',
  'ALTER TABLE crm_tasks ALTER COLUMN task_type SET NOT NULL',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE crm_tasks ALTER COLUMN due_date DROP NOT NULL',
  'ALTER TABLE crm_tasks ALTER COLUMN title DROP NOT NULL',
  'ALTER TABLE crm_tasks ALTER COLUMN task_type DROP NOT NULL',
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
