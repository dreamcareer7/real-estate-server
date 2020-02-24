const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE google_calendar_events    DROP COLUMN IF EXISTS crm_task_foreign_key',
  'ALTER TABLE microsoft_calendar_events DROP COLUMN IF EXISTS crm_task_foreign_key',

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
