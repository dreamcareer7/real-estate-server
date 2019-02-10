'use strict'

const path = require('path')
const fs = require('fs')
const async = require('async')
const db = require('../lib/utils/db')

const sql_path = p => path.resolve(__dirname, '../lib/sql/contact', p)
const source = p => fs.readFileSync(sql_path(p), 'utf-8')

const up = [
  'BEGIN',
  `UPDATE
    contacts_attributes
  SET
    index = NULL
  WHERE
    attribute_type = 'stage'`,
  `WITH tag_id AS (
    SELECT id FROM contacts_attribute_defs WHERE name = 'tag' LIMIT 1
  )
  UPDATE
    contacts_attributes
  SET
    attribute_type = 'tag',
    attribute_def = tag_id.id
  FROM
    tag_id
  WHERE
    attribute_type = 'stage'
  `,
  `WITH lids AS (
    UPDATE
      contact_search_lists
    SET
      deleted_at = now()
    WHERE
      created_at = updated_at
      AND deleted_at IS NULL
      AND name = 'General'
    RETURNING
      id
  )
  UPDATE
    contact_lists_members clm
  SET
    deleted_at = now()
  FROM
    lids
  WHERE
    clm.list = lids.id
  `,
  `WITH tag_id AS (
    SELECT id FROM contacts_attribute_defs WHERE name = 'tag' AND global IS True LIMIT 1
  ), stage_id AS (
    SELECT id FROM contacts_attribute_defs WHERE name = 'stage' AND global IS True LIMIT 1
  )
  UPDATE
    contact_search_lists
  SET
    filters = replace(
      filters::text,
      (SELECT id FROM stage_id LIMIT 1)::text,
      (SELECT id FROM tag_id LIMIT 1)::text
    )::jsonb
  `,
  'DELETE FROM contacts_attribute_defs WHERE name = \'stage\' AND global IS True RETURNING id',
  `UPDATE
    contacts_summaries
  SET
    tag = tag || stage
  WHERE
    stage <> 'General'
    AND stage <> ALL(tag)
  `,
  'ALTER TABLE contacts_summaries DROP stage',
  'DROP FUNCTION get_contact_summaries(uuid[])',
  source('functions/get_contact_summaries.fn.sql'),
  'DROP FUNCTION get_contact_summaries2(uuid[])',
  source('functions/get_contact_summaries2.fn.sql'),
  'COMMIT'
]

const down = [
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
