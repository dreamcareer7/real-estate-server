'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE brands_checklists ADD is_deactivatable BOOLEAN NOT NULL DEFAULT FALSE',
  'ALTER TABLE deals_checklists  ADD terminated_at timestamp with time zone',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE brands_checklists DROP is_deactivatable',
  'ALTER TABLE deals_checklists DROP terminated_at',
  'COMMIT'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      client.release()
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
