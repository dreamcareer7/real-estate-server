'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE notifications rename COLUMN exclude TO exclude_old',
  'ALTER TABLE notifications ADD exclude uuid[]',
  'ALTER TABLE notifications ADD FOREIGN KEY(specific) REFERENCES users(id)',
  'UPDATE notifications SET exclude = ARRAY[notifications.exclude_old]',
  'ALTER TABLE notifications DROP COLUMN IF EXISTS exclude_old',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE notifications rename COLUMN exclude TO exclude_old',
  'ALTER TABLE notifications ADD exclude uuid REFERENCES users(id)',
  'UPDATE notifications SET exclude = exclude_old[1]',
  'ALTER TABLE notifications DROP COLUMN IF EXISTS exclude_old',
  'COMMIT'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), next)
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
