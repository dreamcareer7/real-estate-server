'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `UPDATE
    contacts
  SET
    "user" = COALESCE(created_by, "user")`,
  `UPDATE
    contacts_summaries
  SET
    "user" = COALESCE(created_by, "user")`,
  'COMMIT'
]

const down = [
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
