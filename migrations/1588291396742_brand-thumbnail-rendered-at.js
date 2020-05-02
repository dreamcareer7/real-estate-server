const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_allowed_templates ADD thumbnail_rendered_at timestamp without time zone',
  'UPDATE brands_allowed_templates SET thumbnail_rendered_at = CLOCK_TIMESTAMP() WHERE thumbnail IS NOT NULL',
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
