'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE OR REPLACE VIEW unread_notifications AS
    SELECT
      notifications.*,
      notifications_users.user
    FROM notifications
    JOIN notifications_users      ON notifications.id = notifications_users.notification
    FULL JOIN
      notifications_deliveries ON
        notifications.id = notifications_deliveries.notification AND
        notifications_users.user = notifications_deliveries.user
    WHERE
      notifications_users.acked_at IS NULL
      AND notifications_deliveries.id IS NULL`,

  `CREATE OR REPLACE FUNCTION
      unread_room_notifications(interval) RETURNS TABLE (
        room uuid,
        "user" uuid,
        first_unread double precision,
        last_unread timestamptz
      )
    AS $$
    SELECT
      room,
      "user",
      EXTRACT( -- Time of the first unread notification for this user on this room.
        EPOCH FROM ((array_agg(created_at ORDER BY created_at  ASC))[1]::timestamptz)
      ) as first_unread,
      (
        (array_agg(created_at ORDER BY created_at DESC))[1]
      ) as last_unread
    FROM
      unread_notifications
    WHERE
      created_at >= (NOW() - $1)
      AND room IS NOT NULL
    GROUP BY
      "user",
      room
    $$
    LANGUAGE SQL STABLE`,
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
