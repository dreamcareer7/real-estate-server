'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE envelopes_documents (
    id uuid DEFAULT uuid_generate_v1() PRIMARY KEY,
    envelope uuid NOT NULL REFERENCES envelopes(id),
    title TEXT,
    document_id SMALLINT,
    submission_revision uuid REFERENCES forms_data(id)
  )`,
  'ALTER TABLE envelopes ADD title TEXT',
  'ALTER TABLE forms ADD name TEXT',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE envelopes_documents',
  'ALTER TABLE envelopes DROP title',
  'ALTER TABLE forms DROP name',
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
