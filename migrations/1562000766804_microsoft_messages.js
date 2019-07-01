const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `DROP TABLE IF EXISTS
  microsoft_messages`,

  `CREATE TABLE IF NOT EXISTS microsoft_messages(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials(id),
    remote_id TEXT NOT NULL,
    data JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (microsoft_credential, remote_id)
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
