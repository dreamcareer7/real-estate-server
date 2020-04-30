const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TABLE IF NOT EXISTS microsoft_mail_folders(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  
    credential uuid NOT NULL REFERENCES microsoft_credentials(id),
    folders JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,
  
    UNIQUE (credential)
  )`,

  `CREATE TABLE IF NOT EXISTS google_mail_labels(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  
    credential uuid NOT NULL REFERENCES google_credentials(id),
    labels JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,
  
    UNIQUE (credential)
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
