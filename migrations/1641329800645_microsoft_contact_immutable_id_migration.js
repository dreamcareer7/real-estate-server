const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE microsoft_contacts ADD COLUMN IF NOT EXISTS new_remote_id text',
  'ALTER TABLE microsoft_credentials ADD COLUMN IF NOT EXISTS contact_migration_status text DEFAULT \'waiting\'',
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for (const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => { }