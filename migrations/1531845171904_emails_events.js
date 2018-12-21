'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE emails ADD PRIMARY KEY (id)',
  `CREATE TYPE email_event AS ENUM(
    'accepted',
    'rejected',
    'delivered',
    'failed',
    'opened',
    'clicked',
    'unsubscribed',
    'complained',
    'stored'
  )`,
  `CREATE TABLE emails_events (
    id uuid DEFAULT public.uuid_generate_v1() NOT NULL PRIMARY KEY,
    email uuid NOT NULL REFERENCES emails(id),
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    recipient TEXT NOT NULL,
    event email_event NOT NULL
  )`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE emails_events',
  'DROP TYPE email_event',
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
