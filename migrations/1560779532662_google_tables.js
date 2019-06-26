const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `DROP TABLE IF EXISTS
    google_credentials CASCADE`,

  `DROP TABLE IF EXISTS
    google_contacts CASCADE`,

  `DROP TABLE IF EXISTS
    google_contact_groups CASCADE`,



  `DELETE FROM contacts_summaries
    WHERE source_type = 'Google'`,



  `DROP INDEX IF EXISTS
    google_credentials_user_brand`,

  `DROP INDEX IF EXISTS
    google_credentials_user_brand_email`,

  `DROP INDEX IF EXISTS
    contacts_google_id`,



  `CREATE TABLE IF NOT EXISTS google_credentials(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    email TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    first_name TEXT NULL,
    last_name TEXT NULL,
    photo TEXT NULL,

    messages_total INTEGER,
    threads_total INTEGER,
    history_id INTEGER,

    access_token VARCHAR(256) NOT NULL,
    refresh_token VARCHAR(256) NOT NULL,
    expiry_date INTEGER,
    scope JSONB,

    revoked BOOLEAN DEFAULT FALSE,

    last_sync_at timestamptz DEFAULT NULL,
    last_sync_duration INTEGER,

    contacts_last_sync_at timestamptz DEFAULT NULL,

    messages_sync_history_id VARCHAR(256) DEFAULT NULL,
    threads_sync_history_id VARCHAR(256) DEFAULT NULL,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (access_token),
    UNIQUE (refresh_token)
  )`,

  `CREATE TABLE IF NOT EXISTS google_contact_groups(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),
    entry_id TEXT NOT NULL,
    entry JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (google_credential, entry_id)
  )`,

  `CREATE TABLE IF NOT EXISTS google_contacts(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),
    entry_id TEXT NOT NULL,
    entry JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (google_credential, entry_id)
  )`,


  `CREATE UNIQUE INDEX IF NOT EXISTS
    google_credentials_user_brand_email ON google_credentials ("user", brand, email)`,


  `ALTER TABLE contacts
    DROP COLUMN IF EXISTS google_id`,

  `ALTER TABLE contacts
    ADD COLUMN IF NOT EXISTS google_id uuid REFERENCES google_contacts(id)`,

  `CREATE UNIQUE INDEX IF NOT EXISTS
    contacts_google_id ON contacts (google_id) WHERE google_id IS NOT NULL`,

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
