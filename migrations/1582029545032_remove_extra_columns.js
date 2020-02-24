const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE crm_tasks DROP COLUMN IF EXISTS google_event_id',
  'ALTER TABLE crm_tasks DROP COLUMN IF EXISTS microsoft_event_id',

  'ALTER TABLE google_calendar_events DROP COLUMN IF EXISTS recurring_eventid',

  'ALTER TABLE google_sync_histories DROP COLUMN IF EXISTS synced_calendar_events_num',
  'ALTER TABLE google_sync_histories DROP COLUMN IF EXISTS calendar_events_total',

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

