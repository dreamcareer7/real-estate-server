'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `ALTER TABLE contacts
    ADD COLUMN IF NOT EXISTS last_touch timestamptz,
    ADD COLUMN IF NOT EXISTS next_touch timestamptz`,
  `ALTER TABLE contact_search_lists
    DROP COLUMN IF EXISTS touch_freq,
    ADD COLUMN touch_freq int`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE contacts DROP COLUMN last_touch, DROP COLUMN next_touch',
  'ALTER TABLE contact_search_lists DROP COLUMN touch_freq',
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
