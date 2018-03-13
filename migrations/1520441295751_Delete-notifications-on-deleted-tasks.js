'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'UPDATE notifications SET deleted_at = now() WHERE id IN (SELECT id FROM crm_tasks WHERE deleted_at IS NOT NULL)',
]

const down = [
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
