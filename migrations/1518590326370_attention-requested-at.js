'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE tasks ADD attention_requested_at timestamp with time zone',
  'UPDATE tasks SET attention_requested_at = NOW() WHERE needs_attention = TRUE',
  'ALTER TABLE tasks DROP needs_attention',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE tasks ADD needs_attention BOOLEAN NOT NULL DEFAULT FALSE',
  'ALTER TABLE tasks DROP attention_requested_at',
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
