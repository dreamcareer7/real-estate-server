const db = require('../lib/utils/db')

// TODO: store feedback email ID instead

const migrations = [
  'BEGIN',
  'ALTER TABLE showings_appointments ADD COLUMN feedback_email_sent BOOLEAN NOT NULL DEFAULT true',
  'ALTER TABLE showings_appointments ALTER COLUMN feedback_email_sent SET DEFAULT false',
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
