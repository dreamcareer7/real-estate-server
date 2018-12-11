'use strict'

const fs = require('fs')
const async = require('async')
const db = require('../lib/utils/db')
const current_deal_context_trigger = fs.readFileSync(__dirname + '/../lib/sql/deal/context/update_current_deal_context.trigger.sql', 'utf-8')
const current_deal_context_fn = fs.readFileSync(__dirname + '/../lib/sql/deal/context/update_current_deal_context.fn.sql', 'utf-8')



const up = [
  'BEGIN',
  `ALTER TABLE deal_context
    ADD checklist uuid REFERENCES deals_checklists(id)`,

  `ALTER TABLE current_deal_context
    ADD checklist uuid REFERENCES deals_checklists(id)`,


  `UPDATE deal_context SET checklist = (
    SELECT tasks.checklist FROM deal_context
    JOIN forms_data ON deal_context.revision = forms_data.id
    JOIN forms_submissions ON forms_data.submission = forms_submissions.id
    JOIN tasks ON forms_submissions.id = tasks.submission
  )`,

  current_deal_context_trigger,
  current_deal_context_fn,

  `ALTER TABLE current_deal_context DROP revision`,
  `ALTER TABLE current_deal_context DROP submission`,

  'COMMIT'
]

const down = [
  'BEGIN',
  'UNDO SOMETHING',
  'UNDO SOMETHING ELSE',
  'UNDO EVEN MORE',
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
