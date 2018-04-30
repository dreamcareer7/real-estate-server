'use strict'

const async = require('async')
const fs = require('fs')
const db = require('../lib/utils/db')

const current_deal_context = fs.readFileSync(__dirname + '/../lib/sql/deal/context/current_deal_context.view.sql', 'utf-8')

const up = [
  'BEGIN',
  current_deal_context,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP VIEW current_deal_context',
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
