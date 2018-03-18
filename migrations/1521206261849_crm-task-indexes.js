'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'CREATE INDEX IF NOT EXISTS crm_tasks_assignee_idx ON crm_tasks (assignee)',
  'CREATE INDEX IF NOT EXISTS crm_tasks_created_by_idx ON crm_tasks (created_by)',
  'CREATE INDEX IF NOT EXISTS crm_tasks_due_date_idx ON crm_tasks (due_date DESC)',
  'CREATE INDEX IF NOT EXISTS reminders_task_idx ON reminders (task)',
  'CREATE INDEX IF NOT EXISTS crm_associations_crm_task_idx ON crm_associations (crm_task)',
  'CREATE INDEX IF NOT EXISTS crm_associations_contact_idx ON crm_associations (contact)',
  'CREATE INDEX IF NOT EXISTS crm_associations_listing_idx ON crm_associations (listing)',
  'CREATE INDEX IF NOT EXISTS crm_associations_deal_idx ON crm_associations (deal)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP INDEX crm_tasks_assignee_idx',
  'DROP INDEX crm_tasks_created_by_idx',
  'DROP INDEX crm_tasks_due_date_idx',
  'DROP INDEX reminders_task_idx',
  'DROP INDEX crm_associations_crm_task_idx',
  'DROP INDEX crm_associations_contact_idx',
  'DROP INDEX crm_associations_listing_idx',
  'DROP INDEX crm_associations_deal_idx',
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
