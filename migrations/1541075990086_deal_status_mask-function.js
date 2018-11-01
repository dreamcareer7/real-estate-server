'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const deal_status_mask = fs.readFileSync(__dirname + '/../lib/sql/deal/functions/deal_status_mask.fn.sql', 'utf-8')
const calendar = fs.readFileSync(__dirname + '/../lib/sql/calendar/calendar.view.sql', 'utf-8')

const up = [
  'BEGIN',
  'DROP VIEW IF EXISTS analytics.calendar',
  deal_status_mask,
  calendar,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION deal_status_mask',
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
