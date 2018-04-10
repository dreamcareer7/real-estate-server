'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const clear_reminder_notifications = fs.readFileSync(__dirname + '/../lib/sql/crm/reminder/triggers/clear_reminder_notifications.fn.sql', 'utf-8')
const clear_reminder_notifications_on_timestamp_update = fs.readFileSync(__dirname + '/../lib/sql/crm/reminder/triggers/clear_reminder_notifications_on_timestamp_update.trigger.sql', 'utf-8')

const up = [
  'BEGIN',
  clear_reminder_notifications,
  clear_reminder_notifications_on_timestamp_update,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TRIGGER clear_reminder_notifications_on_timestamp_update ON reminders',
  'DROP FUNCTION clear_reminder_notifications',
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
