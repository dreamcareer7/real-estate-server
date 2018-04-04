'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `ALTER TABLE crm_activities
    DROP COLUMN title,
    DROP COLUMN searchable_field`,
  'CREATE INDEX crm_activities_trgm_idx ON crm_activities USING gin (description gin_trgm_ops)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP INDEX crm_activities_trgm_idx',
  `ALTER TABLE crm_activities
    ADD COLUMN title text NOT NULL,
    ADD COLUMN searchable_field text`,
  'CREATE INDEX crm_activities_trgm_idx ON crm_activities USING gin (searchable_field gin_trgm_ops)',
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
