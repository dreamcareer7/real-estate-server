'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TYPE task_status AS ENUM (\'New\', \'Done\', \'Later\');'
]

const down = [
  'DROP TYPE IF EXISTS task_status;'
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
