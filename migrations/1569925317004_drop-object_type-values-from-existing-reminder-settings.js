const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `UPDATE
    calendar_notification_settings
  SET
    object_type = NULL
  WHERE
    object_type = 'contact_attribute'
    AND event_type = 'home_anniversary'`,
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
