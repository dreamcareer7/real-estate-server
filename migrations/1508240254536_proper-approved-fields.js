'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE deal_context ADD approved_by uuid REFERENCES users(id)',
  'ALTER TABLE deal_context ADD approved_at TIMESTAMP WITH TIME ZONE',
  'ALTER TABLE deal_context DROP approved',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE deal_context DROP approved_at',
  'ALTER TABLE deal_context DROP approved_by',
  'ALTER TABLE deal_context ADD approved BOOLEAN NOT NULL DEFAULT FALSE',
  'COMMIT'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      client.release()
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
