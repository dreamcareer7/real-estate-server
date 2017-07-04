'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'DELETE FROM notifications_tokens',
  'ALTER TABLE notifications_tokens DROP COLUMN IF EXISTS device_id',
  'ALTER TABLE notifications_tokens RENAME COLUMN device_token TO channel',
  'ALTER TABLE notifications_tokens ADD UNIQUE("user", channel)'
]

const down = [
  'DELETE FROM notifications_tokens',
  'ALTER TABLE notifications_tokens DROP CONSTRAINT IF EXISTS notifications_tokens_user_channel_key',
  'ALTER TABLE notifications_tokens RENAME COLUMN channel TO device_token',
  'ALTER TABLE notifications_tokens ADD device_id text',
  'ALTER TABLE notifications_tokens ADD UNIQUE("user", device_id)'
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
