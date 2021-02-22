const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE microsoft_credentials ADD COLUMN IF NOT EXISTS cfolders_sync_token TEXT DEFAULT NULL',
  'ALTER TABLE microsoft_credentials ADD COLUMN IF NOT EXISTS people_apis_enabled BOOLEAN DEFAULT FALSE',

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
