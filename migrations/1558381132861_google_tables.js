const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `DROP TABLE IF EXISTS
    gmail_auth_links CASCADE`,

  `DROP TABLE IF EXISTS
    gmails CASCADE`,

  `DROP TABLE IF EXISTS
    gmail_messages CASCADE`,

  `DROP TABLE IF EXISTS
    gmail_threads CASCADE`,

  `DROP TABLE IF EXISTS
    gmail_messages_sync CASCADE`,

  `DROP TABLE IF EXISTS
    gmail_contacts CASCADE`,

  `DROP TABLE IF EXISTS
    gmail_contacts_sync CASCADE`,


  `CREATE TABLE IF NOT EXISTS gmails(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    email VARCHAR(128) UNIQUE NOT NULL,
    messages_total INTEGER NOT NULL,
    threads_total INTEGER NOT NULL,

    access_token VARCHAR(256) NOT NULL,
    refresh_token VARCHAR(256) NOT NULL,
    expiry_date TIMESTAMP,

    scope VARCHAR(256) NOT NULL,

    revoked BOOLEAN DEFAULT FALSE,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz
  )`,

  `CREATE TABLE IF NOT EXISTS gmail_auth_links(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    email VARCHAR(256) UNIQUE NOT NULL,
    scope VARCHAR(512) NOT NULL,
    url VARCHAR(512) NOT NULL,
    webhook VARCHAR(512) NOT NULL,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE ("user", brand),
    UNIQUE (url)
  )`,

  `CREATE TABLE IF NOT EXISTS gmail_messages(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    gmail uuid NOT NULL REFERENCES gmails(id),

    message_id VARCHAR(32) UNIQUE NOT NULL,
    thread_id VARCHAR(32) NOT NULL,
    history_id VARCHAR(32),
    snippet TEXT,
    label_ids TEXT ARRAY,
    payload_headers JSONB,
    internal_date TIMESTAMP,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz
  )`,

  `CREATE TABLE IF NOT EXISTS gmail_threads(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    gmail uuid NOT NULL REFERENCES gmails(id),

    thread_id VARCHAR(32) UNIQUE NOT NULL,
    history_id VARCHAR(32) NOT NULL,
    snippet TEXT NOT NULL,
    label_ids TEXT ARRAY,
    payload_headers JSONB,
    internal_date TIMESTAMP,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz
  )`,

  `CREATE TABLE IF NOT EXISTS gmail_messages_sync(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    gmail uuid NOT NULL REFERENCES gmails(id),
    email VARCHAR(128) UNIQUE NOT NULL,

    synced_messages_num INTEGER DEFAULT 0,
    synced_threads_num INTEGER DEFAULT 0,

    next_sync_date TIMESTAMP DEFAULT NULL,
    last_sync_date TIMESTAMP DEFAULT NULL,
    last_sync_duration REAL DEFAULT 0,

    in_progress BOOLEAN DEFAULT TRUE,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz
  )`,

  `CREATE TABLE IF NOT EXISTS gmail_contacts(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    gmail uuid NOT NULL REFERENCES gmails(id),

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz
  )`,

  `CREATE TABLE IF NOT EXISTS gmail_contacts_sync(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    gmail uuid NOT NULL REFERENCES gmails(id),
    email VARCHAR(128) UNIQUE NOT NULL,

    synced_contacts_num INTEGER DEFAULT 0,

    next_sync_date TIMESTAMP DEFAULT NULL,
    last_sync_date TIMESTAMP DEFAULT NULL,
    last_sync_duration REAL DEFAULT 0,

    in_progress BOOLEAN DEFAULT TRUE,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz
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
