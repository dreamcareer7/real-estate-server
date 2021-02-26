const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE microsoft_contact_folders ADD COLUMN IF NOT EXISTS sync_token TEXT DEFAULT NULL',
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
