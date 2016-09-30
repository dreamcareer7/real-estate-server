'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE UNIQUE INDEX IF NOT EXISTS mls_data_matrix_unique_id_idx on mls_data(matrix_unique_id)'
]

const down = [
  'DROP INDEX IF EXISTS mls_data_matrux_unique_id_idx'
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
