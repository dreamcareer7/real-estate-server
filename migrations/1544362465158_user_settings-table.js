'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE IF NOT EXISTS users_settings (
    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid REFERENCES brands(id),
    key text NOT NULL,
    value json,

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    PRIMARY KEY ("user", brand, key)
  )`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE IF EXISTS users_settings',
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
