'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `WITH lists(name, filters, is_pinned) AS (VALUES
    ('General', '[{"attribute_type": "stage", "value": "General"}]'::jsonb, false),
    ('Past Client', '[{"attribute_type": "stage", "value": "Past Client"}]'::jsonb, false)
  )
  INSERT INTO contact_search_lists
    ("user", name, filters, is_pinned)
  SELECT
    users.id AS "user", lists.*
  FROM
    users
  CROSS JOIN
    lists
  WHERE
    users.deleted_at IS NULL
    AND users.is_shadow IS FALSE
    AND users.user_type = 'Agent'
    AND users.agent IS NOT NULL
  `,
  `UPDATE
    contact_search_lists
  SET
    created_at = NOW() + interval '1 minute',
    updated_at = NOW() + interval '1 minute'
  WHERE
    name = 'Warm List' OR name = 'Hot List'
  `,
  `UPDATE
    contact_search_lists
  SET
    created_at = NOW() + interval '2 minutes',
    updated_at = NOW() + interval '2 minutes'
  WHERE
    name = 'Past Client'
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
