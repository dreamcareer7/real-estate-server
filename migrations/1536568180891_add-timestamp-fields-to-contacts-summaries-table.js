'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE contacts_summaries ADD COLUMN created_at timestamptz',
  'ALTER TABLE contacts_summaries ADD COLUMN updated_at timestamptz',
  `UPDATE
    contacts_summaries
  SET
    created_at = c.created_at,
    updated_at = c.updated_at
  FROM
    contacts AS c
  WHERE
    c.id = contacts_summaries.id`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE contacts_summaries DROP COLUMN created_at',
  'ALTER TABLE contacts_summaries DROP COLUMN updated_at',
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
