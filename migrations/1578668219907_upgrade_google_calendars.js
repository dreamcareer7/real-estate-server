const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  
  'ALTER TABLE google_credentials DROP CONSTRAINT IF EXISTS google_credentials_rechat_gcalendar_fkey',
  'ALTER TABLE google_credentials DROP COLUMN     IF EXISTS rechat_gcalendar',

  'ALTER TABLE google_credentials ADD COLUMN IF NOT EXISTS google_calendar uuid NULL REFERENCES google_calendars(id)',

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
