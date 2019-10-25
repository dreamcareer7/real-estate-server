const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE google_credentials ADD COLUMN IF NOT EXISTS rechat_gcalendar uuid NULL REFERENCES google_calendars(id)',
  'ALTER TABLE google_credentials ADD COLUMN IF NOT EXISTS calendars_last_sync_at timestamp with time zone',

  'ALTER TABLE google_sync_histories ADD COLUMN IF NOT EXISTS synced_calendar_events_num integer DEFAULT 0',
  'ALTER TABLE google_sync_histories ADD COLUMN IF NOT EXISTS calendar_events_total integer DEFAULT 0',

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
