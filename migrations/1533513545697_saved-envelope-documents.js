'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE envelopes_documents_revisions (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    created_at timestamp without time zone DEFAULT clock_timestamp() NOT NULL ,
    file uuid NOT NULL REFERENCES files(id),
    envelope_document uuid NOT NULL REFERENCES envelopes_documents(id)
  )`,
  'CREATE INDEX envelopes_documents_revisions_envelope_document ON envelopes_documents_revisions (envelope_document)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE envelopes_documents_revisions',
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
