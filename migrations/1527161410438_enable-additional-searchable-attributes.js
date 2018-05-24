'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `UPDATE
    contacts_attribute_defs
  SET
    searchable = True
  WHERE
    name = ANY(ARRAY[
      'tag',
      'source',
      'job_title',
      'company',
      'note',
      'state'
    ])`,

  `WITH csf AS (
    SELECT
      contact, array_to_string(array_agg(text), ' ') as searchable_field
    FROM
      contacts_attributes
      JOIN contacts_attribute_defs ON contacts_attributes.attribute_def = contacts_attribute_defs.id
    WHERE
      searchable IS True
      AND data_type = 'text'
      AND contacts_attributes.deleted_at IS NULL
      AND contacts_attribute_defs.deleted_at IS NULL
    GROUP BY
      contact
  )
  UPDATE
    contacts
  SET
    searchable_field = csf.searchable_field
  FROM
    csf
  WHERE
    contacts.id = csf.contact`,

  'COMMIT'
]

const down = [
  'BEGIN',
  `UPDATE
    contacts_attribute_defs
  SET
    searchable = False
  WHERE
    name = ANY(ARRAY[
      'tag',
      'source',
      'job_title',
      'company',
      'note',
      'state'
    ])`,

  `WITH csf AS (
    SELECT
      contact, array_to_string(array_agg(text), ' ') as searchable_field
    FROM
      contacts_attributes
      JOIN contacts_attribute_defs ON contacts_attributes.attribute_def = contacts_attribute_defs.id
    WHERE
      searchable IS True
      AND data_type = 'text'
      AND contacts_attributes.deleted_at IS NULL
      AND contacts_attribute_defs.deleted_at IS NULL
    GROUP BY
      contact
  )
  UPDATE
    contacts
  SET
    searchable_field = csf.searchable_field
  FROM
    csf
  WHERE
    contacts.id = csf.contact`,

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
