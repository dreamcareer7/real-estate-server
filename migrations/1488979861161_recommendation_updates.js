'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TYPE recommendation_last_update AS ENUM (\'New\', \'PriceDrop\', \'StatusChange\', \'OpenHouseAvailable\')',
  'ALTER TABLE recommendations ADD last_update recommendation_last_update DEFAULT \'New\''
]

const down = [
  'ALTER TABLE recommendations DROP COLUMN last_update',
  'DROP TYPE recommendation_last_update',
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
