const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TABLE IF NOT EXISTS google_calendar_events(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  
    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    google_credential uuid NOT NULL REFERENCES google_credentials(id),
    google_calendar uuid NOT NULL REFERENCES google_calendars(id),
  
      event_id TEXT NOT NULL,
      etag TEXT,

      description TEXT,
      summary TEXT,
      location TEXT,
      colorId TEXT,
      iCalUID TEXT,
      transparency TEXT,
      visibility TEXT,
      hangoutLink TEXT,
      htmlLink TEXT,

      status TEXT,
      
      anyoneCanAddSelf BOOLEAN,
      guestsCanInviteOthers BOOLEAN,
      guestsCanModify BOOLEAN,
      guestsCanSeeOtherGuests BOOLEAN,
      attendeesOmitted BOOLEAN,
      locked BOOLEAN,
      privateCopy BOOLEAN,

      sequence NUMBER,

      creator JSONB,
      organizer JSONB,
      attendees JSONB,
      attachments JSONB,
      conferenceData JSONB,
      extendedProperties JSONB,
      gadget JSONB,
      reminders JSONB,
      source JSONB,
      
      created timestamptz NOT NULL,
      updated timestamptz NOT NULL,
      
      start JSONB,
      end JSONB,
      endTimeUnspecified BOOLEAN,
      recurrence JSONB,
      recurringEventId TEXT,
      originalStartTime JSONB,

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
