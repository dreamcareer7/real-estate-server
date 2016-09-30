'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE alerts ADD COLUMN open_house BOOLEAN'
]

const down = [
  'ALTER TABLE alerts DROP COLUMN open_house'
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
