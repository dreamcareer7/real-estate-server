'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `CREATE TABLE brokerwolf_settings (
    id uuid NOT NULL DEFAULT uuid_generate_v1() PRIMARY KEY,
    brand uuid NOT NULL UNIQUE REFERENCES brands(id),
    api_token TEXT NOT NULL,
    consumer_key TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    client_code TEXT NOT NULL,
    host TEXT NOT NULL
  )`
]

const down = [
  'DROP TABLE brands_brokerwolf'
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
