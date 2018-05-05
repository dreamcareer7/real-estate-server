'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'DROP FUNCTION deal_context()',
  'CREATE INDEX deal_context_deal ON deal_context(deal)',
  'CREATE INDEX deals_roles_deal ON deals_roles(deal)',
  'CREATE INDEX deals_checklists_deal ON deals_checklists(deal)',
  'CREATE INDEX envelopes_deal ON envelopes(deal)',
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
