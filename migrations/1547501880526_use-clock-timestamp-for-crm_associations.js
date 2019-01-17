'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'alter table crm_associations alter column created_at set default clock_timestamp()',
  'alter table crm_associations alter column updated_at set default clock_timestamp();',
  'COMMIT'
]

const down = [
  'BEGIN',
  'alter table crm_associations alter column created_at set default now()',
  'alter table crm_associations alter column updated_at set default now();',
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
