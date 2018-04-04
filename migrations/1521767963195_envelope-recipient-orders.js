'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE envelopes_recipients ADD "order" SMALLINT NOT NULL DEFAULT 1',
  `ALTER TYPE envelope_recipient_status
    ADD VALUE 'Created'`
]

const down = [
  'ALTER TABLE envelopes_recipients DROP "order"'
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
