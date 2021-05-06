const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at)',
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
