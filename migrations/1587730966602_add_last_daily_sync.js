
const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE google_credentials ADD COLUMN IF NOT EXISTS last_daily_sync timestamp with time zone',
  'update google_credentials set last_daily_sync = now()',

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
