const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE calendar_notification_settings DROP CONSTRAINT calendar_notification_settings_user_object_type_event_type_key',
  'ALTER TABLE calendar_notification_settings ADD CONSTRAINT calendar_notification_settings_user_uniqueness UNIQUE ("user", brand, object_type, event_type)',
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
