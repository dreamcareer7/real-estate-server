'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE attachments ADD info jsonb;'
]

const down = [
  'ALTER TABLE attachments DROP COLUMN info;'
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
