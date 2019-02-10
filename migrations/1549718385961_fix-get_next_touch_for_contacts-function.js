'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION get_next_touch_for_contacts(uuid[])
  RETURNS TABLE (
    contact uuid,
    next_touch timestamptz
  )
  LANGUAGE SQL
  AS $$
    WITH next_touches AS (
      SELECT
        contacts.id,
        MIN(COALESCE(last_touch, NOW()) + (touch_freq || ' days')::interval) AS next_touch
      FROM
        contacts
        JOIN unnest($1::uuid[]) AS cids(id)
          ON contacts.id = cids.id
        JOIN crm_lists_members AS clm
          ON contacts.id = clm.contact
        JOIN crm_lists AS csl
          ON csl.id = clm.list
      WHERE
        clm.deleted_at IS NULL
        AND csl.deleted_at IS NULL
        AND touch_freq IS NOT NULL
      GROUP BY
        contacts.id
    )
    SELECT
      id,
      next_touch
    FROM
      unnest($1::uuid[]) AS cids(id)
      LEFT JOIN next_touches USING (id)
  $$`,
  'COMMIT'
]

const down = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION get_next_touch_for_contacts(uuid[])
  RETURNS TABLE (
    contact uuid,
    next_touch timestamptz
  )
  LANGUAGE SQL
  AS $$
    WITH next_touches AS (
      SELECT
        contacts.id,
        MIN(COALESCE(last_touch, NOW()) + (touch_freq || ' days')::interval) AS next_touch
      FROM
        contacts
        JOIN unnest($1::uuid[]) AS cids(id)
          ON contacts.id = cids.id
        JOIN contact_lists_members AS clm
          ON contacts.id = clm.contact
        JOIN contact_search_lists AS csl
          ON csl.id = clm.list
      WHERE
        clm.deleted_at IS NULL
        AND csl.deleted_at IS NULL
        AND touch_freq IS NOT NULL
      GROUP BY
        contacts.id
    )
    SELECT
      id,
      next_touch
    FROM
      unnest($1::uuid[]) AS cids(id)
      LEFT JOIN next_touches USING (id)
  $$`,
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
