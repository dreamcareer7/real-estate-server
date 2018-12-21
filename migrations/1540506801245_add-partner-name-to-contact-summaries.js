'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE contacts ADD COLUMN IF NOT EXISTS partner_name text',
  'ALTER TABLE contacts_summaries ADD COLUMN IF NOT EXISTS partner_name text',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE contacts_summaries DROP COLUMN IF EXISTS partner_name',
  'ALTER TABLE contacts DROP COLUMN IF EXISTS partner_name',
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
