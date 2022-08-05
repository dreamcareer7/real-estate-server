const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE social_posts RENAME COLUMN TEMPLATE TO template_instance',
  'ALTER TABLE social_posts ALTER facebook_page SET NOT NULL',
  'ALTER TABLE social_posts ALTER created_at SET NOT NULL',
  'ALTER TABLE social_posts ALTER updated_at SET NOT NULL',
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
