'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE brands_checklists ADD is_terminatable BOOLEAN NOT NULL DEFAULT false',
  'ALTER TABLE brands_checklists ADD tab_name TEXT NOT NULL',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE brands_checklists DROP is_terminatable',
  'ALTER TABLE brands_checklists DROP tab_name',
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
