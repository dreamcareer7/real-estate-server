const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `DROP TABLE IF EXISTS
    microsoft_messages`,


  `CREATE TABLE IF NOT EXISTS microsoft_messages(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials(id),

    message_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    recipients TEXT [],
    in_bound BOOLEAN NOT NULL,

    data JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (microsoft_credential, message_id)
  )`,


  `CREATE TABLE IF NOT EXISTS microsoft_conversations(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials(id),
    microsoft_contact uuid NOT NULL REFERENCES microsoft_contacts(id),
    microsoft_message uuid NOT NULL REFERENCES microsoft_messages(id),

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (microsoft_credential, microsoft_contact, microsoft_message)
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