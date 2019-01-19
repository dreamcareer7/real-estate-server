'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE IF NOT EXISTS calendar_notification_logs (
    id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    "timestamp" timestamptz not null,
    "user" uuid REFERENCES users (id),
    notification uuid REFERENCES notifications (id),
  
    PRIMARY KEY (id, "user", "timestamp")
  )`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE IF EXISTS calendar_notification_logs',
  'COMMIT'
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
