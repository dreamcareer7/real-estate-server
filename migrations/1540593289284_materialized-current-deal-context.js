'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const current_deal_context_fn = fs.readFileSync(__dirname + '/../lib/sql/deal/context/update_current_deal_context.fn.sql', 'utf-8')
const current_deal_context_trigger = fs.readFileSync(__dirname + '/../lib/sql/deal/context/update_current_deal_context.trigger.sql', 'utf-8')
const calendar = fs.readFileSync(__dirname + '/../lib/sql/calendar/calendar.view.sql', 'utf-8')

const up = [
  'BEGIN',
  'CREATE TABLE new_deal_context AS SELECT * FROM current_deal_context',
  'ALTER TABLE new_deal_context ADD PRIMARY KEY (id)',
  'ALTER TABLE new_deal_context ADD CONSTRAINT current_deal_context_deal FOREIGN KEY (deal) REFERENCES deals(id)',
  'ALTER TABLE new_deal_context ADD CONSTRAINT current_deal_context_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)',
  'ALTER TABLE new_deal_context ADD CONSTRAINT current_deal_context_created_by FOREIGN KEY (created_by) REFERENCES users(id)',
  'ALTER TABLE new_deal_context ADD CONSTRAINT current_deal_context_revision FOREIGN KEY (revision) REFERENCES forms_data(id)',

  'CREATE INDEX current_deal_context_deal ON new_deal_context(deal)',
  'CREATE INDEX current_deal_context_key ON new_deal_context(key)',

  'DROP VIEW IF EXISTS analytics.calendar',
  'DROP VIEW IF EXISTS current_deal_context',
  'ALTER TABLE new_deal_context RENAME TO current_deal_context',
  current_deal_context_fn,
  current_deal_context_trigger,
  calendar,
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
