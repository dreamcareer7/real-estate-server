const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `DROP TABLE IF EXISTS
    google_sync_histories`,

  `CREATE TABLE IF NOT EXISTS google_sync_histories(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),

    synced_messages_num INTEGER,
    messages_total INTEGER,

    synced_threads_num INTEGER,
    threads_total INTEGER,

    synced_contacts_num INTEGER,
    contacts_total INTEGER,

    sync_duration INTEGER,

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
