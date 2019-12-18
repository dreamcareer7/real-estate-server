const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_allowed_templates ADD thumbnail_requested_at timestamp with time zone',
  'UPDATE brands_allowed_templates SET thumbnail_requested_at = NOW()',
  'ALTER TABLE files ALTER COLUMN created_by DROP NOT NULL',
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
