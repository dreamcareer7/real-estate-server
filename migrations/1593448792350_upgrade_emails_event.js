const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TYPE public.emails_events_device AS ENUM(
    'console',
    'mobile',
    'tablet',
    'smarttv',
    'wearable',
    'embedded'
  )`,

  'ALTER TABLE emails_events ADD COLUMN url         TEXT NULL',
  'ALTER TABLE emails_events ADD COLUMN ip          TEXT NULL',
  'ALTER TABLE emails_events ADD COLUMN client_os   TEXT NULL',
  'ALTER TABLE emails_events ADD COLUMN client_type TEXT NULL',
  'ALTER TABLE emails_events ADD COLUMN device_type public.emails_events_device NULL',
  'ALTER TABLE emails_events ADD COLUMN location    JSON NULL',

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
