'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'UPDATE crm_tasks SET updated_at = created_at WHERE updated_at IS NULL',
  'ALTER TABLE crm_tasks ALTER COLUMN updated_at SET NOT NULL',
  'ALTER TABLE crm_tasks ALTER COLUMN updated_at SET DEFAULT now()',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE crm_tasks ALTER COLUMN updated_at DROP DEFAULT',
  'ALTER TABLE crm_tasks ALTER COLUMN updated_at DROP NOT NULL',
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
