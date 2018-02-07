'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `CREATE TABLE IF NOT EXISTS reminders (
    id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz,
    deleted_at timestamptz,

    "time" int,
    relative_time boolean,
    "timestamp" timestamptz,

    task uuid REFERENCES tasks(id)
  )`
]

const down = [
  'DROP TABLE IF EXISTS reminders'
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
