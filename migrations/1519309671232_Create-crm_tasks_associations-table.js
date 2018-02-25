'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `CREATE TYPE crm_association_type AS ENUM (
    'contact',
    'deal',
    'listing'
  )`,
  `CREATE TABLE IF NOT EXISTS crm_associations (
    id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz,
  
    association_type crm_association_type NOT NULL,
    crm_task uuid REFERENCES crm_tasks(id),
    activity uuid REFERENCES activities(id),
    -- contact_note uuid REFERENCES contact_notes(id),
  
    deal uuid REFERENCES deals(id),
    contact uuid REFERENCES contacts(id),
    listing uuid REFERENCES listings(id)
  )`
]

const down = [
  'DROP TABLE IF EXISTS crm_associations',
  'DROP TYPE crm_association_type',
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
