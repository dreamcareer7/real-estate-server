const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  // 'ALTER TABLE microsoft_contacts RENAME COLUMN remote_id TO old_remote_id',
  // 'ALTER TABLE microsoft_contacts ALTER COLUMN old_remote_id DROP NOT NULL',
  // 'ALTER TABLE microsoft_contacts RENAME COLUMN new_remote_id TO remote_id',
  // 'CREATE UNIQUE INDEX microsoft_contacts_on_multi_fields_when_not_deleted_key ON public.microsoft_contacts (microsoft_credential, remote_id) WHERE (deleted_at IS NULL)',
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
