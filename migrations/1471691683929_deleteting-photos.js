'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE photos ADD   deleted_at     timestamp with time zone',
  'ALTER TABLE listings ADD photos_checked_at timestamp with time zone'
]

const down = [
  'ALTER TABLE photos   DROP COLUMN deleted_at',
  'ALTER TABLE listings DROP COLUMN photos_checked_at'
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
