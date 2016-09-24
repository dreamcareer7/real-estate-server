'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = ['CREATE TYPE note_types AS ENUM (\'Transaction\');']

const down = ['DROP TYPE note_types']

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
