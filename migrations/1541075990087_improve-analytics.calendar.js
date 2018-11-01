'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const calendar_view = fs.readFileSync(__dirname + '/../lib/sql/calendar/calendar.view.sql', 'utf-8')
const get_contact_display_name = fs.readFileSync(__dirname + '/../lib/sql/contact/functions/get_contact_display_name.fn.sql', 'utf-8')
const get_deal_display_title = fs.readFileSync(__dirname + '/../lib/sql/calendar/get_deal_display_title.fn.sql', 'utf-8')
const deal_status_mask = fs.readFileSync(__dirname + '/../lib/sql/deal/functions/deal_status_mask.fn.sql', 'utf-8')

const up = [
  'BEGIN',
  'DROP VIEW IF EXISTS analytics.calendar',
  'DROP FUNCTION IF EXISTS get_contact_display_name(uuid)',
  'DROP FUNCTION IF EXISTS get_deal_display_title(uuid)',
  'DROP FUNCTION IF EXISTS deal_status_mask(uuid, text[])',

  deal_status_mask,
  get_deal_display_title,
  get_contact_display_name,
  calendar_view,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP VIEW IF EXISTS analytics.calendar',
  'DROP FUNCTION IF EXISTS get_contact_display_name(uuid)',
  'DROP FUNCTION IF EXISTS get_deal_display_title(uuid)',
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
