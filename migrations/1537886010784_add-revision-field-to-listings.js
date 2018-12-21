'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'alter table listings add column if not exists revision smallint',
  `UPDATE
    listings
  SET
    revision = mls_data.revision
  FROM
    mls_data
  WHERE
    listings.matrix_unique_id = mls_data.matrix_unique_id`,
  'CREATE INDEX listings_muid_rev_idx ON listings (matrix_unique_id, revision)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP INDEX listings_muid_rev_idx',
  'ALTER TABLE listings DROP COLUMN IF EXISTS revision',
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
