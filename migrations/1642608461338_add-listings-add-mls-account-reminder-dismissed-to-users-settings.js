const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE users_settings
     ADD COLUMN listings_add_mls_account_reminder_dismissed boolean DEFAULT false`,
  'COMMIT',
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
