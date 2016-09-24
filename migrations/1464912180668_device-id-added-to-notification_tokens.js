'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'DELETE FROM notification_tokens WHERE id NOT IN(SELECT DISTINCT ON ("user") id FROM notification_tokens  ORDER BY "user", created_at DESC)',
  'ALTER TABLE notification_tokens DROP CONSTRAINT notification_tokens_user_device_token_key',
  'ALTER TABLE notification_tokens ADD COLUMN device_id TEXT',
  'ALTER TABLE notification_tokens ADD CONSTRAINT notification_tokens_user_device_id UNIQUE("user", device_id)',
  'COMMIT'
]

const down = [
  'ALTER TABLE notification_tokens DROP COLUMN device_id'
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
