'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE reviews DROP envelope',
  'ALTER TABLE reviews DROP envelope_document',
  'ALTER TABLE reviews ADD  envelope_document uuid REFERENCES envelopes_documents(id)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE reviews DROP envelope_document',
  'ALTER TABLE reviews ADD  envelope_document smallint',
  'ALTER TABLE reviews ADD envelope uuid REFERENCES envelopes(id)',
  'COMMIT'
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
