'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TABLE IF NOT EXISTS tasks(id uuid DEFAULT uuid_generate_v1() PRIMARY KEY, \
"user" uuid NOT NULL REFERENCES users(id), \
title text, \
due_date timestamptz, \
status task_status NOT NULL DEFAULT \'New\', \
"transaction" uuid REFERENCES transactions(id), \
created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW(), deleted_at timestamptz);'
]

const down = [
  'DROP TABLE IF EXISTS tasks'
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
