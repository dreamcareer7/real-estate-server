'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const brand_parents = require('fs').readFileSync('./lib/sql/brand/brand_parents.fn.sql').toString()
const brand_children = require('fs').readFileSync('./lib/sql/brand/brand_children.fn.sql').toString()

const up = [
  'BEGIN',
  'ALTER TABLE brands ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE',
  brand_parents,
  brand_children,
  'COMMIT'
]

const down = [
  'ALTER TABLE brands DROP deleted_at'
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
