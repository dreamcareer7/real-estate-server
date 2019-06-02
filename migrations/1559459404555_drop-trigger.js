const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP TRIGGER IF EXISTS update_email_campaign_stats ON emails_events',
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
