const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_allowed_templates ADD is_thumbnail_ready BOOLEAN NOT NULL DEFAULT FALSE',
  'UPDATE brands_allowed_templates SET is_thumbnail_ready = TRUE WHERE thumbnail IS NOT NULL',
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
