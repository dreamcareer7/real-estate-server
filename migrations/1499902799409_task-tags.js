'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `CREATE TABLE tasks_tags (
    id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    task uuid NOT NULL REFERENCES tasks(id),
    tag uuid NOT NULL REFERENCES brands_tags(id)
  )`
]

const down = [
  'DROP TABLE tasks_tags'
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
