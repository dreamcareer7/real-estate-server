const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TYPE public.contact_integration_origin
    AS ENUM ('google', 'microsoft', 'rechat')`,

  `CREATE TABLE IF NOT EXISTS contact_integration(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    google_id uuid NULL REFERENCES google_contacts(id),
    microsoft_id uuid NULL REFERENCES microsoft_contacts(id),

    contact uuid NULL REFERENCES contacts(id),

    origin public.contact_integration_origin NOT NULL,
    etag TEXT NOT NULL,
    local_etag TEXT,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz
  )`,

  'CREATE UNIQUE INDEX IF NOT EXISTS contact_integration_gid ON contact_integration (google_id) WHERE google_id is NOT NULL',
  'CREATE UNIQUE INDEX IF NOT EXISTS contact_integration_mid ON contact_integration (microsoft_id) WHERE microsoft_id is NOT NULL',

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
