'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE emails (
    id uuid DEFAULT public.uuid_generate_v1() NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT[] NOT NULL,
    subject TEXT NOT NULL,
    html TEXT,
    text TEXT,
    headers JSONB,
    mailgun_id TEXT UNIQUE
  )`,
  'COMMIT'
]

const down = [
  'DROP TABLE emails'
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
