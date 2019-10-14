const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TABLE IF NOT EXISTS google_calendars(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  
    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),
  
    calendar_id TEXT NOT NULL,
    etag TEXT,

    accessRole TEXT,
    description TEXT,
    summary TEXT,
    summaryOverride TEXT,
    location TEXT,
    timeZone TEXT,

    backgroundColor TEXT,
    foregroundColor TEXT,
    colorId TEXT,    

    primary BOOLEAN,
    hidden BOOLEAN,
    selected BOOLEAN,
    deleted BOOLEAN,

    defaultReminders JSONB,
    conferenceProperties JSONB,
    notificationSettings JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz  
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
