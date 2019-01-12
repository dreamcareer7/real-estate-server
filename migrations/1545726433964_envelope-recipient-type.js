'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TYPE envelope_recipient_type
    AS ENUM('Signer', 'CarbonCopy')`,
  'ALTER TABLE envelopes_recipients ADD envelope_recipient_type envelope_recipient_type',
  `UPDATE envelopes_recipients
    SET envelope_recipient_type = 'Signer'`,
  'ALTER TABLE envelopes_recipients ALTER envelope_recipient_type SET NOT NULL',
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
