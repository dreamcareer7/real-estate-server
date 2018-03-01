'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE deal_context ADD deal uuid NOT NULL REFERENCES deals(id)',
  'ALTER TABLE deals DROP context'
]

const down = [
  'ALTER TABLE deal_context DROP deal',
  'ALTER TABLE deals ADD context jsonb'
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
