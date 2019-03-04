const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP VIEW new_notifications',
  `CREATE OR REPLACE VIEW new_notifications AS
  SELECT
    notifications.id,
    notifications.object,
    notifications.created_at,
    notifications.updated_at,
    notifications.room,
    notifications.action,
    notifications.object_class,
    notifications.subject,
    notifications.auxiliary_object_class,
    notifications.auxiliary_object,
    notifications.recommendation,
    notifications.auxiliary_subject,
    notifications.subject_class,
    notifications.auxiliary_subject_class,
    notifications.extra_subject_class,
    notifications.extra_object_class,
    notifications.deleted_at,
    notifications.specific,
    notifications.exclude,
    notifications.title,
    notifications.data,
    notifications_users.user as "user",
    notifications_users.message as message
  FROM notifications
  JOIN
    notifications_users ON notifications.id = notifications_users.notification
  WHERE
  notifications_users.acked_at IS NULL`,
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
