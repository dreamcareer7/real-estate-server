'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE messages DROP COLUMN IF EXISTS message_type',
  'DROP TYPE IF EXISTS message_type'
]

const down = [
  'CREATE TYPE message_type AS ENUM (\'TopLevel\', \'SubLevel\')',
  'ALTER TABLE messages ADD message_type message_type NOT NULL DEFAULT \'TopLevel\''
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
