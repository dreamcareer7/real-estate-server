'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE alerts DROP COLUMN location',
  'ALTER TABLE alerts DROP COLUMN vertical_distance',
  'ALTER TABLE alerts DROP COLUMN horizontal_distance'
]

const down = []

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
