'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE IF NOT EXISTS calendar_feed_settings (
    "user" uuid primary key REFERENCES users(id),
    selected_brand uuid REFERENCES alerts(id),
    selected_types text[],
    created_at timestamp with time zone DEFAULT transaction_timestamp() NOT NULL,
    updated_at timestamp with time zone DEFAULT transaction_timestamp() NOT NULL,
    deleted_at timestamp with time zone
  )
  `,
  'COMMIT'
]

const down = [
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
