'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE calendar_feed_settings ADD COLUMN filter jsonb[]',
  `UPDATE
    calendar_feed_settings
  SET
    filter = CASE
      WHEN selected_users IS NULL OR array_length(selected_users, 1) < 1 THEN
        ARRAY[jsonb_build_object('brand', selected_brand)]
      ELSE
        ARRAY[jsonb_build_object(
          'brand',
          selected_brand,
          'users',
          selected_users
        )]
    END`,
  'ALTER TABLE calendar_feed_settings DROP COLUMN selected_users',
  'ALTER TABLE calendar_feed_settings DROP COLUMN selected_brand',
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
