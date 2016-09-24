'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE alerts DROP COLUMN mls_areas',
  'ALTER TABLE alerts ADD COLUMN mls_areas int[][2]'
]

const down = [
  'ALTER TABLE alerts DROP COLUMN mls_areas',
  'ALTER TABLE alerts ADD COLUMN mls_areas jsonb'
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
