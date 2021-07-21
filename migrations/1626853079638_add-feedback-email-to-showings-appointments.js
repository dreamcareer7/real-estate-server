const db = require('../lib/utils/db')

// TODO: store feedback email ID instead

const migrations = [
  'BEGIN',
  'ALTER TABLE showings_appointments ADD COLUMN feedback_email uuid REFERENCES emails(id)',
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
