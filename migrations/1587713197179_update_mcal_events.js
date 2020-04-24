const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE microsoft_calendar_events DROP COLUMN IF EXISTS is_reminderOn',
  'ALTER TABLE microsoft_calendar_events DROP COLUMN IF EXISTS is_reminderon',
  'ALTER TABLE microsoft_calendar_events ADD COLUMN IF NOT EXISTS is_reminder_on BOOLEAN',

  'ALTER TABLE microsoft_calendar_events DROP COLUMN IF EXISTS series_masterId',
  'ALTER TABLE microsoft_calendar_events DROP COLUMN IF EXISTS series_masterid',
  'ALTER TABLE microsoft_calendar_events ADD COLUMN IF NOT EXISTS series_master_id TEXT',

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
