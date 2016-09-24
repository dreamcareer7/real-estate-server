'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TABLE cmas (id uuid NOT NULL DEFAULT uuid_generate_v4(), \
"user" uuid NOT NULL REFERENCES users(id), \
room uuid NOT NULL REFERENCES rooms(id), \
suggested_price float NOT NULL, \
comment text, listings text[] NOT NULL, \
created_at timestamptz DEFAULT NOW(), \
updated_at timestamptz DEFAULT NOW(), \
deleted_at timestamptz);'
]

const down = [
  'DROP TABLE cmas;'
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
