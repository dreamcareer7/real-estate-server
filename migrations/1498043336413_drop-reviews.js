'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'DROP TABLE reviews_history',
  'DROP TABLE reviews',
  'DROP TYPE review_state'
]

const down = [
  'CREATE TYPE review_state AS ENUM (\'Pending\', \'Rejected\', \'Approved\')',
  `CREATE TABLE reviews (
    id uuid DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT NOW(),
    deleted_at timestamp with time zone,
    deal uuid NOT NULL REFERENCES deals(id),
    file uuid REFERENCES files(id),
    envelope uuid REFERENCES envelopes(id),
    envelope_document smallint
  )`,
  `CREATE TABLE reviews_history (
    id uuid DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT NOW(),
    created_by uuid NOT NULL REFERENCES users(id),
    review uuid NOT NULL REFERENCES reviews(id),
    state review_state NOT NULL,
    comment TEXT
  )`,
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
