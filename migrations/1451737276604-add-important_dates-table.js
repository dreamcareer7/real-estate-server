'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TABLE IF NOT EXISTS important_dates(id uuid DEFAULT uuid_generate_v1() PRIMARY KEY, \
title text NOT NULL, \
"transaction" uuid NOT NULL REFERENCES transactions(id), \
due_date timestamptz, \
created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW(), deleted_at timestamptz);'
]

const down = [
  'DROP TABLE IF EXISTS important_dates'
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
