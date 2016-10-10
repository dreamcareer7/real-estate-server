'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TYPE notification_action ADD VALUE IF NOT EXISTS \'IsDue\';',
  'ALTER TYPE notification_action ADD VALUE IF NOT EXISTS \'Assigned\';',
  'ALTER TYPE notification_action ADD VALUE IF NOT EXISTS \'Withdrew\';',
  'ALTER TYPE notification_object_class ADD VALUE IF NOT EXISTS \'Task\';',
  'ALTER TYPE notification_object_class ADD VALUE IF NOT EXISTS \'Transaction\';',
  'ALTER TYPE notification_object_class ADD VALUE IF NOT EXISTS \'Contact\';'
]

const down = [
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
