'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE mls_data ADD COLUMN revision SMALLINT NOT NULL DEFAULT 1',
  'UPDATE mls_data SET revision = photos.revision FROM photos WHERE mls_data.matrix_unique_id = photos.matrix_unique_id',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE mls_data DROP COLUMN revision',
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
