'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE IF NOT EXISTS contacts_duplicate_pairs (
    a uuid NOT NULL,
    b uuid NOT NULL,
    "user" uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    ignored_at timestamptz,
    PRIMARY KEY (a, b),
    CHECK (a < b)
  )`,
  'CREATE INDEX IF NOT EXISTS contacts_duplicate_pairs_left_idx ON contacts_duplicate_pairs (a)',
  'CREATE INDEX IF NOT EXISTS contacts_duplicate_pairs_right_idx ON contacts_duplicate_pairs (b)',
  'CREATE INDEX IF NOT EXISTS contacts_duplicate_pairs_user_idx ON contacts_duplicate_pairs ("user")',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE IF EXISTS contacts_duplicate_pairs',
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
