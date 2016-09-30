'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE mls_jobs ADD "limit" integer',
  'ALTER TABLE mls_jobs ADD "offset" integer'
]

const down = [
  'ALTER TABLE mls_jobs DROP COLUMN "limit"',
  'ALTER TABLE mls_jobs DROP COLUMN "offset"'
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
