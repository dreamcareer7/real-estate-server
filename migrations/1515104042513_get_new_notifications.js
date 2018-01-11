'use strict'

const async = require('async')
const db = require('../lib/utils/db')

/* DEPRECATED MIGRATION */
// Replaced by a later migration
// - migrations/1512283503146_Check deleted at in deal_contexts function.js

const fn = require('fs').readFileSync('./lib/sql/room/get_new_notifications.fn.sql').toString()

const up = [
  'BEGIN',
  fn,
  'COMMIT'
]

const down = [
  'DROP FUNCTION get_new_notifications(uuid[], uuid)'
]


const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), next)
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
