const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'DROP TABLE IF EXISTS google_calendars',

  `CREATE TABLE IF NOT EXISTS google_calendars(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),
    calendar_id TEXT NOT NULL,

    access_role TEXT,
    description TEXT,
    summary TEXT,
    summary_override TEXT,
    location TEXT,
    time_zone TEXT,

    background_color TEXT,
    foreground_color TEXT,
    color_id TEXT,    

    "primary" BOOLEAN,
    hidden BOOLEAN,
    selected BOOLEAN,
    deleted BOOLEAN,

    default_reminders JSONB,
    conference_properties JSONB,
    notification_settings JSONB,

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