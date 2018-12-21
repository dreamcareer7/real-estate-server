'use strict'

const path = require('path')
const fs = require('fs')
const async = require('async')
const db = require('../lib/utils/db')

const sql_path = p => path.resolve(__dirname, '../lib/sql/contact', p)
const source = p => fs.readFileSync(sql_path(p), 'utf-8')

const up = [
  'BEGIN',
  `ALTER TABLE crm_tasks
    ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id)`,
  `ALTER TABLE contacts
    ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id)`,
  `ALTER TABLE contacts_attributes
    ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id)`,
  `ALTER TABLE contacts_attribute_defs
    ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id)`,
  `ALTER TABLE contact_search_lists
    ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id)`,
  'DROP FUNCTION IF EXISTS delete_contact_attribute_def(uuid)',
  source('functions/delete_contact_attribute_def.fn.sql'),
  'COMMIT'
]

const down = [
  'BEGIN',
  `ALTER TABLE crm_tasks
    ADD COLUMN updated_by uuid REFERENCES users(id),
    ADD COLUMN deleted_by uuid REFERENCES users(id)`,
  `ALTER TABLE contacts
    ADD COLUMN updated_by uuid REFERENCES users(id),
    ADD COLUMN deleted_by uuid REFERENCES users(id)`,
  `ALTER TABLE contacts_attributes
    ADD COLUMN updated_by uuid REFERENCES users(id),
    ADD COLUMN deleted_by uuid REFERENCES users(id)`,
  `ALTER TABLE contacts_attribute_defs
    ADD COLUMN updated_by uuid REFERENCES users(id),
    ADD COLUMN deleted_by uuid REFERENCES users(id)`,
  `ALTER TABLE contact_search_lists
    ADD COLUMN updated_by uuid REFERENCES users(id),
    ADD COLUMN deleted_by uuid REFERENCES users(id)`,
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
