const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',


  // 'ALTER TABLE google_contacts DROP CONSTRAINT IF EXISTS google_contacts_google_credential_entry_id_key',

  'ALTER TABLE google_contacts ADD COLUMN IF NOT EXISTS resource_id TEXT',
  'ALTER TABLE google_contacts ADD COLUMN IF NOT EXISTS resource    JSONB',

  // 'ALTER TABLE google_contacts ADD CONSTRAINT IF NOT EXISTS gcontacts_gcredential_resource_id UNIQUE (google_credential, resource_id)',


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
