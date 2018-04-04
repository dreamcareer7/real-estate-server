'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE IF NOT EXISTS crm_activities (
    id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    created_by uuid NOT NULL REFERENCES users(id),
    brand uuid REFERENCES brands(id),
  
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz,
  
    title text not null,
    "description" text,
    searchable_field text,
    "activity_type" text not null,
    outcome text,
    "timestamp" timestamptz not null
  )`,
  'CREATE INDEX crm_activities_created_by_idx ON crm_activities (created_by)',
  'CREATE INDEX crm_activities_trgm_idx ON crm_activities USING gin (searchable_field gin_trgm_ops)',
  `ALTER TABLE crm_associations
    DROP COLUMN activity,
    ADD COLUMN crm_activity uuid REFERENCES crm_activities(id)`,
  'COMMIT'
]

const down = [
  'BEGIN',
  `ALTER TABLE crm_associations
    DROP COLUMN crm_activity,
    ADD COLUMN activity uuid REFERENCES activities(id)`,
  'DROP INDEX crm_activities_trgm_idx',
  'DROP INDEX crm_activities_created_by_idx',
  'DROP TABLE crm_activities',
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
