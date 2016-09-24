'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE alerts ADD listing_statuses listing_status[] NOT NULL DEFAULT \'{"Active"}\';',
  'UPDATE alerts SET listing_statuses = \'{"Active"}\';'
]

const down = [
  'ALTER TABLE alerts DROP COLUMN listing_statuses;'
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
