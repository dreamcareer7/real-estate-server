'use strict'

const async = require('async')
const db = require('../lib/utils/db')
// const fn = require('fs').readFileSync('./lib/sql/brand/brand_parents.fn.sql').toString()

const up = [
  'BEGIN',
//   fn,
  'COMMIT'
]

const down = [
  'BEGIN',
//   'DROP FUNCTION brand_parents(id uuid)',
  'COMMIT'
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
