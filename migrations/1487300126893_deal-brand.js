'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fn = require('fs').readFileSync('./lib/sql/brand/brand_children.fn.sql').toString()

const up = [
  'BEGIN',
  'ALTER TABLE deals ADD brand uuid REFERENCES brands(id)',
  fn,
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE deals DROP brand',
  'DROP FUNCTION brand_children(id uuid)',
  'COMMIT'
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
