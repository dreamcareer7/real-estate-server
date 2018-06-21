'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE contacts ALTER COLUMN "user" DROP NOT NULL, ALTER COLUMN brand SET NOT NULL',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE contacts ALTER COLUMN brand DROP NOT NULL, ALTER COLUMN "user" SET NOT NULL',
  'COMMIT'
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
