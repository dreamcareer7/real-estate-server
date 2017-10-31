'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE brands_tags ADD allowed_tasks task_type[]',
  'ALTER TABLE brands_tags ADD "order" smallint',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE brands_tags DROP allowed_tasks',
  'ALTER TABLE brands_tags DROP "order"',
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
