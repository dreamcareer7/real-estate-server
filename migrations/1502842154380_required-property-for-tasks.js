'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE brands_checklists_tasks ADD required BOOLEAN NOT NULL DEFAULT false',
  'ALTER TABLE tasks ADD required BOOLEAN NOT NULL DEFAULT false',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE brands_checklists_tasks DROP required',
  'ALTER TABLE tasks DROP required',
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
