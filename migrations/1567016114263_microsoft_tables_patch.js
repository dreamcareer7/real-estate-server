const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE microsoft_messages ADD COLUMN IF NOT EXISTS message_created_at bigint',
  'ALTER TABLE microsoft_sync_histories ADD COLUMN IF NOT EXISTS extract_contacts_error TEXT',

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
