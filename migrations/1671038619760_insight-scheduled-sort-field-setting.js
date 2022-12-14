const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE users_settings
     ADD COLUMN IF NOT EXISTS insight_scheduled_sort_field json`,
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
