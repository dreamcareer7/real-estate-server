'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sort_field text',
  `WITH ids AS (
    SELECT array_agg(id) AS ids FROM contacts WHERE deleted_at IS NULL
  ), summaries AS (
    SELECT
      s.id,
      COALESCE(
        last_name,
        marketing_name,
        first_name,
        nickname,
        company,
        email,
        phone_number,
        'Guest'
      ) AS sort_field
    FROM ids, get_contact_summaries(ids.ids) AS s
  )
  UPDATE
    contacts
  SET
    sort_field = summaries.sort_field
  FROM
    summaries
  WHERE
    contacts.id = summaries.id`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE contacts DROP COLUMN IF EXISTS sort_field',
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
