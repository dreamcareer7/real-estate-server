'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE contact_search_lists RENAME TO crm_lists',
  'DELETE FROM crm_lists WHERE brand IS NULL',
  `ALTER TABLE crm_lists
    ADD COLUMN is_and_filter boolean NOT NULL DEFAULT TRUE,
    ADD COLUMN is_editable boolean NOT NULL DEFAULT TRUE,
    DROP COLUMN is_pinned,
    ALTER COLUMN brand SET NOT NULL
  `,
  `UPDATE
    crm_lists
  SET
    is_editable = (CASE WHEN args::jsonb ? 'filter_type' IS TRUE THEN args->>'filter_type' = 'and' ELSE TRUE END)
  `,
  'CREATE INDEX crm_lists_brand ON crm_lists (brand)',
  `CREATE TYPE crm_filter_op AS ENUM (
    'eq',
    'lte',
    'gte',
    'between',
    'any',
    'all'
  )`,
  `CREATE TABLE IF NOT EXISTS crm_lists_filters (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    crm_list uuid REFERENCES crm_lists (id),
  
    attribute_def uuid REFERENCES contacts_attribute_defs (id),
    operator crm_filter_op NOT NULL DEFAULT 'eq',
    "value" json,
    invert boolean
  )`,
  'CREATE INDEX crm_list_filters_list ON crm_lists_filters (crm_list)',
  `INSERT INTO crm_lists_filters (
    crm_list,
  
    attribute_def,
    operator,
    "value",
    invert
  )
  SELECT
    cl.id,
    attribute_def,
    COALESCE(operator, 'eq') AS operator,
    "value",
    COALESCE(invert, FALSE) AS invert
  FROM
    crm_lists AS cl,
    jsonb_populate_recordset(null::crm_lists_filters, cl.filters) AS filters
  `,
  'ALTER TABLE contact_lists_members RENAME TO crm_lists_members',
  `ALTER TABLE crm_lists
    DROP COLUMN filters,
    DROP COLUMN args
  `,
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
