'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE users ADD last_seen_at timestamp with time zone',
  'ALTER TABLE users ADD last_seen_by uuid',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE users DROP last_seen_time',
  'ALTER TABLE users DROP last_seen_client',
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
