const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE super_campaigns_enrollments
     ADD COLUMN IF NOT EXISTS detached boolean NOT NULL DEFAULT FALSE`,
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
