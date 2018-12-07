'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE templates_user_assets RENAME TO templates_assets',
  'ALTER TABLE templates_assets ALTER listing DROP NOT NULL',
  'ALTER TABLE templates_assets ALTER contact DROP NOT NULL',
  'COMMIT'
]

const down = []

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
