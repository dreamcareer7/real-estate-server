'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'DROP INDEX IF EXISTS contacts_deleted_at_idx',
  'DROP INDEX IF EXISTS contacts_attributes_deleted_at',
  'CREATE INDEX IF NOT EXISTS contacts_parent_idx ON contacts (parent) WHERE deleted_at IS NULL',
  'DROP INDEX IF EXISTS contacts_attributes_contact',
  'CREATE INDEX IF NOT EXISTS contacts_attributes_contact ON contacts_attributes (contact) WHERE deleted_at IS NULL',
  'ALTER TABLE contacts_attributes ADD PRIMARY KEY (id)',
  'ALTER TABLE contacts_attributes DROP CONSTRAINT IF EXISTS unique_index_for_contact_attribute_cst',
  'CREATE UNIQUE INDEX unique_index_for_contact_attribute_cst ON contacts_attributes (contact, attribute_def, index) WHERE deleted_at IS NULL',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP INDEX IF EXISTS unique_index_for_contact_attribute_cst',
  'ALTER TABLE contacts_attributes DROP CONSTRAINT contacts_attributes_pkey',
  'DROP INDEX IF EXISTS contacts_attributes_contact',
  'CREATE INDEX contacts_attributes_contact ON contacts_attributes (contact)',
  'DROP INDEX IF EXISTS contacts_parent_idx',
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
