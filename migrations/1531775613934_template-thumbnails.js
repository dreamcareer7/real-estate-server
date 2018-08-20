'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE templates ADD thumbnail TEXT NOT NULL',
  'ALTER TABLE templates ADD width SMALLINT NOT NULL',
  'ALTER TABLE templates ADD height SMALLINT NOT NULL',
  'ALTER TABLE templates DROP ratio',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE templates DROP thumbnail',
  'ALTER TABLE templates DROP width',
  'ALTER TABLE templates DROP height',
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
