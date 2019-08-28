const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TABLE IF NOT EXISTS microsoft_sync_histories(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  
    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials(id),
  
    synced_contacts_num integer DEFAULT 0,
    contacts_total integer DEFAULT 0,

    extract_contacts_error TEXT,
    sync_messages_error TEXT,
    synced_messages_num integer DEFAULT 0,
    messages_total integer DEFAULT 0,

    sync_duration integer DEFAULT 0,
    status BOOLEAN,
  
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz  
  )`,

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
