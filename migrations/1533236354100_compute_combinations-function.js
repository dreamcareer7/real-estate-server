'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const compute_combinations = fs.readFileSync(
  __dirname + '/../lib/sql/contact/functions/compute_combinations.fn.sql',
  'utf-8'
)

const up = [
  'BEGIN',
  compute_combinations,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION compute_combinations(anyarray)',
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
