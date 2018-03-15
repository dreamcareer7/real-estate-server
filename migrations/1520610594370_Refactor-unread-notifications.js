'use strict'

const fs = require('fs')
const async = require('async')
const db = require('../lib/utils/db')

const unread_notifications_view = fs.readFileSync(__dirname + '/../lib/sql/crm/notification/unread_notifications.view.sql', 'utf-8')
const unread_room_notifications_fn = fs.readFileSync(__dirname + '/../lib/sql/crm/message/unread_room_notifications.fn.sql', 'utf-8')

const up = [
  'BEGIN',
  unread_notifications_view,
  unread_room_notifications_fn,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION unread_room_notifications',
  'DROP VIEW unread_notifications',
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
