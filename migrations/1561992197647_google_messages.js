const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',


  `DROP TABLE IF EXISTS
    google_messages`,

  `CREATE TABLE IF NOT EXISTS google_messages(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),

    message_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    history_id TEXT NOT NULL,
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

    UNIQUE (google_credential, message_id)
  )`,


  `ALTER TABLE google_messages
    ADD COLUMN IF NOT EXISTS subject TEXT`,

  `ALTER TABLE google_messages
    ADD COLUMN IF NOT EXISTS has_attachments Boolean`,

  `ALTER TABLE google_messages
    ADD COLUMN IF NOT EXISTS attachments JSONB`,
  
  `ALTER TABLE google_messages
    ADD COLUMN IF NOT EXISTS "from" JSONB`,

  `ALTER TABLE google_messages
    ADD COLUMN IF NOT EXISTS "to" JSONB`,

  `ALTER TABLE google_messages
    ADD COLUMN IF NOT EXISTS cc JSONB`,

  `ALTER TABLE google_messages
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