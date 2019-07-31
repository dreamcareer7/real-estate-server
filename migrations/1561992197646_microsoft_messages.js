const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TABLE IF NOT EXISTS microsoft_messages(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials(id),

    message_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    recipients TEXT [],
    in_bound BOOLEAN NOT NULL,
    message_created_at BIGINT NOT NULL,

    data JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (microsoft_credential, message_id)
  )`,

  `ALTER TABLE microsoft_messages
    DROP COLUMN IF EXISTS conversation_id`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS thread_id TEXT NOT NULL`,


  `ALTER TABLE microsoft_messages
    DROP COLUMN IF EXISTS message_created_at`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS message_created_at BIGINT NOT NULL`,

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