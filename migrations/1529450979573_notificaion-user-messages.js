'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE notifications_users ADD message TEXT',
  'ALTER TABLE notifications_users ADD sms_message TEXT',
  'ALTER TABLE notifications_users ADD push_message TEXT',
  'ALTER TABLE notifications_users ADD branch_url TEXT',
  'ALTER TABLE notifications ADD data JSONB',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE notifications_users DROP message',
  'ALTER TABLE notifications_users DROP sms_message',
  'ALTER TABLE notifications_users DROP push_message',
  'ALTER TABLE notifications_users DROP branch_url',
  'ALTER TABLE notifications DROP data',
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
