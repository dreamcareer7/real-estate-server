'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const calendar_view = fs.readFileSync(__dirname + '/../lib/sql/analytics/calendar/calendar.view.sql', 'utf-8')

const up = [
  'BEGIN',
  'CREATE INDEX contacts_attributes_date_idx ON contacts_attributes("date") WHERE deleted_at IS NULL',
  calendar_view,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP VIEW IF EXISTS analytics.calendar',
  'DROP INDEX contacts_attributes_date_idx',
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
