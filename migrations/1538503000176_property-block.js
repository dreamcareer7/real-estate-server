'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE properties ADD block TEXT',
  `UPDATE properties SET block = (
    SELECT (value->>'Block') FROM mls_data WHERE matrix_unique_id = properties.matrix_unique_id
  )`,
  'COMMIT'
]

const down = [
  'ALTER TABLE properties DROP block'
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
