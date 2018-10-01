'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE crm_tasks DROP COLUMN IF EXISTS notification',
  'ALTER TABLE reminders DROP COLUMN IF EXISTS notification',
  'DROP TRIGGER clear_crm_task_notifications_on_due_update ON crm_tasks',
  'DROP TRIGGER clear_reminder_notifications_on_timestamp_update ON reminders',
  'ALTER TABLE crm_tasks ADD COLUMN needs_notification boolean NOT NULL DEFAULT False',
  'ALTER TABLE reminders ADD COLUMN needs_notification boolean NOT NULL DEFAULT False',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE crm_tasks ADD COLUMN notification uuid REFERENCES notifications(id)',
  'ALTER TABLE reminders ADD COLUMN notification uuid REFERENCES notifications(id)',
  'ALTER TABLE crm_tasks DROP needs_notification',
  'ALTER TABLE reminders DROP needs_notification',
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
