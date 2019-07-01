const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `DROP TABLE IF EXISTS
    microsoft_credentials CASCADE`,

  `DROP TABLE IF EXISTS
    microsoft_contacts CASCADE`,

  `DROP TABLE IF EXISTS
    microsoft_contact_folders CASCADE`,


  `CREATE TABLE IF NOT EXISTS microsoft_credentials(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    email TEXT NOT NULL,
    remote_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    first_name TEXT NULL,
    last_name TEXT NULL,
    photo TEXT NULL,

    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    id_token TEXT NOT NULL,
    expires_in INTEGER,
    ext_expires_in INTEGER,
    scope JSONB,

    revoked BOOLEAN DEFAULT FALSE,

    sync_status TEXT,
    last_sync_at timestamptz DEFAULT NULL,
    last_sync_duration INTEGER,

    contacts_last_sync_at timestamptz DEFAULT NULL,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (access_token),
    UNIQUE (refresh_token)
  )`,


  `CREATE TABLE IF NOT EXISTS microsoft_contact_folders(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials(id),

    folder_id TEXT NOT NULL,
    parent_folder_id TEXT,
    display_ame TEXT,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (microsoft_credential, folder_id)
  )`,


  `CREATE TABLE IF NOT EXISTS microsoft_contacts(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials(id),
    remote_id TEXT NOT NULL,
    data JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (microsoft_credential, remote_id)
  )`,


  `CREATE UNIQUE INDEX IF NOT EXISTS
    microsoft_credentials_user_brand_email ON microsoft_credentials ("user", brand, email)`,


  `ALTER TABLE contacts
    DROP COLUMN IF EXISTS microsoft_id`,

  `ALTER TABLE contacts
    ADD COLUMN IF NOT EXISTS microsoft_id uuid REFERENCES microsoft_contacts(id)`,

  `CREATE UNIQUE INDEX IF NOT EXISTS
    contacts_microsoft_id ON contacts (microsoft_id) WHERE microsoft_id IS NOT NULL`,

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
