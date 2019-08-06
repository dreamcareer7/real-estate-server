const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',


  `CREATE TABLE IF NOT EXISTS microsoft_messages(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials(id),

    message_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    in_bound BOOLEAN NOT NULL,
    recipients TEXT [],

    subject TEXT,
    has_attachments Boolean,
    attachments JSONB,

    from JSONB,
    to JSONB,
    cc JSONB,
    bcc JSONB,

    message_created_at BIGINT NOT NULL,
    data JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (microsoft_credential, message_id)
  )`,


  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS subject TEXT`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS has_attachments Boolean`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS attachments JSONB`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS "from" JSONB`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS "to" JSONB`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS cc JSONB`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS bcc JSONB`,


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