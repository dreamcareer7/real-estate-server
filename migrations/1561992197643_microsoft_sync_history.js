const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `DROP TABLE IF EXISTS
    microsoft_sync_histories`,

  `CREATE TABLE IF NOT EXISTS microsoft_sync_histories(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials(id),

    extract_contacts_error TEXT DEFAULT NULL,
    synced_contacts_num INTEGER DEFAULT 0,
    contacts_total INTEGER  DEFAULT 0,

    sync_messages_error TEXT DEFAULT NULL,
    synced_messages_num INTEGER  DEFAULT 0,
    messages_total INTEGER  DEFAULT 0,

    sync_duration INTEGER  DEFAULT 0,

    status BOOLEAN,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz
  )`,

  `ALTER TABLE microsoft_sync_histories
    DROP COLUMN IF EXISTS synced_messages_error`,

  `ALTER TABLE microsoft_sync_histories
    ADD COLUMN IF NOT EXISTS sync_messages_error TEXT DEFAULT NULL`,

  `ALTER TABLE microsoft_sync_histories
    DROP COLUMN IF EXISTS extract_contacts_error`,

  `ALTER TABLE microsoft_sync_histories
    ADD COLUMN IF NOT EXISTS extract_contacts_error TEXT DEFAULT NULL`,

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