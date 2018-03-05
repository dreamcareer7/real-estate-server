'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE forms_data_context (
    id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
    revision uuid NOT NULL REFERENCES forms_data(id),
    key TEXT,
    value TEXT
  )`,
  'COMMIT'
]

const down = [
  'DROP TABLE forms_data_context'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      client.release()
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
