const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `DROP TABLE IF EXISTS
    google_messages CASCADE`,

  `CREATE TABLE IF NOT EXISTS google_messages(
    message_id VARCHAR(32) NOT NULL PRIMARY KEY,

    google_credential uuid NOT NULL REFERENCES google_credentials(id),

    thread_id VARCHAR(32) NOT NULL,
    history_id VARCHAR(32),
    snippet TEXT,
    label_ids TEXT ARRAY,
    payload JSONB,
    internal_date TIMESTAMP,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (message_id)
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
