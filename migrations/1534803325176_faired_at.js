'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE deals ADD faired_at timestamp with time zone',
  `UPDATE deals SET faired_at = (
    CASE WHEN is_draft IS TRUE THEN NULL
    ELSE updated_at
    END
  )`,
  'ALTER TABLE deals DROP is_draft',
  'COMMIT'
]

const down = []

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
