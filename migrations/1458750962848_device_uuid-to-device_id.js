'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE sessions ALTER COLUMN device_uuid TYPE char varying(255)',
  'ALTER TABLE sessions RENAME COLUMN device_uuid TO device_id',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE sessions RENAME COLUMN device_id TO device_uuid',
  'ALTER TABLE sessions ALTER COLUMN device_uuid TYPE uuid USING device_uuid::uuid;',
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
