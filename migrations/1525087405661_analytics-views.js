'use strict'

const async = require('async')
const fs = require('fs')
const db = require('../lib/utils/db')

const analytics_deals = fs.readFileSync(__dirname + '/../lib/sql/analytics/deals.view.sql', 'utf-8')
const deals_with_rejected_submissions = fs.readFileSync(__dirname + '/../lib/sql/analytics/deals_with_rejected_submissions.view.sql', 'utf-8')

const up = [
  'BEGIN',
  'CREATE SCHEMA IF NOT EXISTS analytics',
  deals_with_rejected_submissions,
  analytics_deals,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP VIEW analytics.deals',
  'DROP VIEW deals_with_rejected_submissions',
  'DROP SCHEMA analytics',
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
