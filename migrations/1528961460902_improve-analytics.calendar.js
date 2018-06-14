'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const calendar_view = fs.readFileSync(__dirname + '/../lib/sql/analytics/calendar/calendar.view.sql', 'utf-8')
const get_contact_display_name = fs.readFileSync(__dirname + '/../lib/sql/contact/functions/get_contact_display_name.fn.sql', 'utf-8')

const up = [
  'BEGIN',
  'DROP VIEW IF EXISTS analytics.calendar',
  'DROP FUNCTION IF EXISTS get_contact_display_name(uuid)',
  get_contact_display_name,
  calendar_view,
  'COMMIT'
]

const down = [
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
