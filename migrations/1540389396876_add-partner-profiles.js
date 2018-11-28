'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE contacts_attributes ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT False',
  'ALTER TABLE contacts_attributes ALTER COLUMN is_partner DROP DEFAULT',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE contacts_attributes DROP COLUMN IF EXISTS is_partner',
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