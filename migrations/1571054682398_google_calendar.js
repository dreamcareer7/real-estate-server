const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE google_calendars DROP COLUMN IF EXISTS accessRole',
  'ALTER TABLE google_calendars ADD COLUMN IF NOT EXISTS access_role TEXT',

  'ALTER TABLE google_credentials DROP COLUMN IF EXISTS rechat_gcalendar',
  'ALTER TABLE google_credentials DROP COLUMN IF EXISTS calendars_last_sync_at',

  'ALTER TABLE google_sync_histories DROP COLUMN IF EXISTS synced_calendar_events_num',
  'ALTER TABLE google_sync_histories DROP COLUMN IF EXISTS calendar_events_total',

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

    access_role TEXT,
    selected BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN DEFAULT FALSE,
    "primary" BOOLEAN DEFAULT FALSE,

    defaultReminders JSONB,
    notificationSettings JSONB,
    conference_properties JSONB,

    origin TEXT,
    sync_token TEXT,

    watcher_status TEXT,
    watcher_channel_id uuid NULL,
    watcher JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (watcher_channel_id),
    UNIQUE (google_credential, calendar_id)
  )`,

  'CREATE UNIQUE INDEX google_calendars_watcher_channel_id ON google_calendars (watcher_channel_id) WHERE watcher_channel_id IS NOT NULL',

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
