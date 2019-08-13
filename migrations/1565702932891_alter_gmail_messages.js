const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE google_messages DROP COLUMN IF EXISTS message_created_at',
  'ALTER TABLE google_messages ADD COLUMN IF NOT EXISTS message_created_at TIMESTAMPTZ',

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
