
const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE google_calendar_events DROP COLUMN IF EXISTS recurring_eventid',
  'ALTER TABLE google_calendar_events DROP COLUMN IF EXISTS recurring_eventId',

  'ALTER TABLE google_calendar_events ADD  COLUMN IF NOT EXISTS recurring_event_id TEXT',

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
