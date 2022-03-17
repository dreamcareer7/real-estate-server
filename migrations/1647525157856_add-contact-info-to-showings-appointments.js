const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE showings_appointments
     ADD COLUMN phone_number TEXT,
     ADD COLUMN first_name TEXT,
     ADD COLUMN last_name TEXT,
     ADD COLUMN company TEXT`,
  'COMMIT',
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
