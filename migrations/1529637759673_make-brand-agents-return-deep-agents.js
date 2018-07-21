'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const fn = fs.readFileSync(__dirname + '/../lib/sql/brand/get_brand_agents.fn.sql').toString()

const up = [
  'BEGIN',
  'DROP FUNCTION get_brand_agents(uuid)',
  fn,
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