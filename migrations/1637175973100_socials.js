const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram TEXT',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter TEXT',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin TEXT',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube TEXT',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook TEXT',
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
