const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'DROP TABLE IF EXISTS google_calendar_events',
  'DROP TABLE IF EXISTS google_calendars',

  `CREATE TABLE IF NOT EXISTS google_calendars(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),
    calendar_id TEXT NOT NULL,

    summary TEXT,
    summary_override TEXT,
    description TEXT,
    location TEXT,
    time_zone TEXT,

    accessRole TEXT,
    selected BOOLEAN,
    "primary" BOOLEAN,

    defaultReminders JSONB,
    notificationSettings JSONB,
    conference_properties JSONB,

    origin TEXT,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (google_credential, calendar_id)
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
