'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE templates ALTER template DROP NOT NULL',
  'ALTER TABLE templates ALTER thumbnail DROP NOT NULL',
  'ALTER TABLE templates ALTER brand DROP NOT NULL',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE templates ALTER template SET NOT NULL',
  'ALTER TABLE templates ALTER thumbnail SET NOT NULL',
  'ALTER TABLE templates ALTER brand SET NOT NULL',
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
