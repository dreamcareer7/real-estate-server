const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'DROP TABLE IF EXISTS google_calendar_events',

  `CREATE TABLE IF NOT EXISTS google_calendar_events(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),
    google_calendar uuid NOT NULL REFERENCES google_calendars(id),
    event_id TEXT NOT NULL,

    description TEXT,
    summary TEXT,
    location TEXT,
    color_id TEXT,
    ical_uid TEXT,
    transparency TEXT,
    visibility TEXT,
    hangout_link TEXT,
    html_link TEXT,

    status TEXT,
    
    anyone_can_add_self BOOLEAN,
    guests_can_invite_others BOOLEAN,
    guests_can_modify BOOLEAN,
    guests_can_see_other_guests BOOLEAN,
    attendees_omitted BOOLEAN,
    locked BOOLEAN,
    private_copy BOOLEAN,

    sequence BIGINT,

    creator JSONB,
    organizer JSONB,
    attendees JSONB,
    attachments JSONB,
    conference_data JSONB,
    extended_properties JSONB,
    gadget JSONB,
    reminders JSONB,
    source JSONB,
    
    created timestamptz NOT NULL,
    updated timestamptz NOT NULL,
    
    "start" JSONB,
    "end" JSONB,
    end_time_unspecified BOOLEAN,
    recurrence JSONB,
    recurring_eventId TEXT,
    original_start_time JSONB,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (google_credential, google_calendar, event_id)
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
