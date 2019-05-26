const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `DROP TABLE IF EXISTS
    google_auth_links CASCADE`,

  `DROP TABLE IF EXISTS
    google_credentials CASCADE`,

  `DROP TABLE IF EXISTS
    google_contacts CASCADE`,

  `DROP TABLE IF EXISTS
    google_contact_groups CASCADE`,

  `DROP TABLE IF EXISTS
    google_messages CASCADE`,


  `CREATE TABLE IF NOT EXISTS google_auth_links(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    key uuid NOT NULL,

    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    email VARCHAR(256) NOT NULL,
    scope VARCHAR(512) NOT NULL,
    url VARCHAR(512) NOT NULL,
    webhook VARCHAR(512) NOT NULL,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE ("user", brand),
    UNIQUE (email),
    UNIQUE (url)
  )`,

  `CREATE TABLE IF NOT EXISTS google_credentials(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    email VARCHAR(128) NOT NULL,
    messages_total INTEGER NOT NULL,
    threads_total INTEGER NOT NULL,
    history_id INTEGER NOT NULL,

    access_token VARCHAR(256) NOT NULL,
    refresh_token VARCHAR(256) NOT NULL,
    expiry_date TIMESTAMP,
    scope VARCHAR(256) NOT NULL,

    last_profile_sync_at timestamptz,

    contacts_sync_token VARCHAR(256) DEFAULT NULL,
    last_contacts_sync_at timestamptz,

    contact_groups_sync_token VARCHAR(256) DEFAULT NULL,
    last_contact_groups_sync_at timestamptz,

    messages_sync_token VARCHAR(256) DEFAULT NULL,
    last_messages_sync_at timestamptz,

    revoked BOOLEAN DEFAULT FALSE,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE ("user", brand),
    UNIQUE (email),
    UNIQUE (access_token),
    UNIQUE (refresh_token)
  )`,

  `CREATE TABLE IF NOT EXISTS google_contacts(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),

    resource_name text NOT NULL,
    meta JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (google_credential, resource_name),
    UNIQUE (resource_name)
  )`,

  `CREATE TABLE IF NOT EXISTS google_contact_groups(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),

    resource_name text NOT NULL,
    meta JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (google_credential, resource_name),
    UNIQUE (resource_name)
  )`,

  `CREATE TABLE IF NOT EXISTS google_messages(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),

    message_id VARCHAR(32) NOT NULL,
    thread_id VARCHAR(32) NOT NULL,
    history_id VARCHAR(32),
    snippet TEXT,
    label_ids TEXT ARRAY,
    payload_headers JSONB,
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
