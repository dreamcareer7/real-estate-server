const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE listings ALTER COLUMN transaction_type DROP NOT NULL',
  'ALTER TABLE listings ALTER COLUMN usage_type DROP NOT NULL',
  'ALTER TABLE listings ALTER COLUMN structure_type DROP NOT NULL',
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
