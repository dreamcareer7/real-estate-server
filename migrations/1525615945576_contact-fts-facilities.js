'use strict'

const async = require('async')
const path = require('path')
const fs = require('fs')
const db = require('../lib/utils/db')

const fn_path = path.resolve.bind(path, __dirname, '..', 'lib/sql/contact/functions')

const get_searchable_field_for_contacts = fs.readFileSync(fn_path('get_searchable_field_for_contacts.fn.sql'), 'utf-8')
const update_searchable_field_for_contacts = fs.readFileSync(fn_path('update_searchable_field_for_contacts.fn.sql'), 'utf-8')
const update_searchable_field_by_attribute_def = fs.readFileSync(fn_path('update_searchable_field_by_attribute_def.fn.sql'), 'utf-8')
const score_contacts_with_search_term = fs.readFileSync(fn_path('score_contacts_with_search_term.fn.sql'), 'utf-8')

const up = [
  'BEGIN',
  'ALTER TABLE contacts ADD COLUMN searchable_field text',
  'CREATE INDEX contacts_trgm_idx ON contacts USING gin (searchable_field gin_trgm_ops)',
  get_searchable_field_for_contacts,
  update_searchable_field_for_contacts,
  update_searchable_field_by_attribute_def,
  score_contacts_with_search_term,
  `SELECT
    update_searchable_field_for_contacts(array_agg(id))
  FROM
    contacts
  WHERE
    deleted_at IS NULL`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION get_searchable_field_for_contacts(uuid[])',
  'DROP FUNCTION update_searchable_field_for_contacts(uuid[])',
  'DROP FUNCTION update_searchable_field_by_attribute_def(uuid)',
  'DROP FUNCTION score_contacts_with_search_term(contacts, text[])',
  'DROP INDEX contacts_trgm_idx',
  'ALTER TABLE contacts DROP COLUMN searchable_field',
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
