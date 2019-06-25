const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `DROP TABLE IF EXISTS
    google_messages CASCADE`,

  `CREATE TABLE IF NOT EXISTS google_messages(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),

    message_id TEXT NOT NULL,    
    thread_id VARCHAR(32) NOT NULL,
    history_id VARCHAR(32),
    snippet TEXT NULL,
    label_ids JSONB,
    internal_date INTEGER,
    size_estimate INTEGER,
    out_bound BOOLEAN DEFAULT FALSE,
    headers JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (google_credential, message_id)
  )`,

  `CREATE TABLE IF NOT EXISTS google_message_contacts(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),

    email TEXT NOT NULL,
    name TEXT,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (google_credential, email)
  )`,

  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
