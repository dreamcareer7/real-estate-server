const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',


  `CREATE TABLE IF NOT EXISTS microsoft_calendars(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials(id),
    calendar_id TEXT NOT NULL,

    name TEXT,
    owner JSONB,

    can_edit Boolean,
    can_share Boolean,
    can_view_private_items Boolean,

    change_key TEXT,
    color TEXT,
    origin TEXT,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (microsoft_credential, calendar_id)
  )`,



  `CREATE TABLE IF NOT EXISTS microsoft_calendar_events(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials(id),
    microsoft_calendar uuid NOT NULL REFERENCES microsoft_calendars(id),
    event_id TEXT NOT NULL,

    subject TEXT,
    type TEXT,
    body_preview TEXT,

    created_date_time timestamptz,
    last_modified_date_time timestamptz,
    original_end_time_zone TEXT,
    original_start_time_zone TEXT,
    event_start JSONB,
    event_end JSONB,

    location JSONB,
    locations JSONB,

    organizer JSONB,
    recurrence JSONB,

    body JSONB,
    attendees JSONB,
    categories JSONB,
    response_status JSONB,

    has_attachments Boolean,
    is_all_day Boolean,
    is_cancelled Boolean,
    is_organizer Boolean,
    is_reminder_on Boolean,
    response_requested Boolean,

    change_key TEXT,
    ical_uid TEXT,
    importance TEXT,
    online_meeting_url TEXT,
    reminder_minutes_before_start BIGINT,
    sensitivity TEXT,
    series_master_id TEXT,
    show_as TEXT,
    web_link TEXT,

    origin TEXT,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (microsoft_credential, microsoft_calendar, event_id)
  )`,


  'ALTER TABLE microsoft_credentials ADD COLUMN IF NOT EXISTS microsoft_calendar uuid NULL REFERENCES microsoft_calendars(id)',
  'ALTER TABLE microsoft_credentials ADD COLUMN IF NOT EXISTS calendars_last_sync_at timestamp with time zone',

  'ALTER TABLE microsoft_sync_histories ADD COLUMN IF NOT EXISTS synced_calendar_events_num integer DEFAULT 0',
  'ALTER TABLE microsoft_sync_histories ADD COLUMN IF NOT EXISTS calendar_events_total integer DEFAULT 0',

  'ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS microsoft_event_id UUID',
  'CREATE UNIQUE INDEX IF NOT EXISTS crm_tasks_mevent_id ON crm_tasks (microsoft_event_id) WHERE microsoft_event_id is NOT null',

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
