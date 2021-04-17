const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE showings DROP CONSTRAINT s_listing_exclusion',
  'ALTER TABLE showings ADD CONSTRAINT s_listing_exclusion CHECK (deal IS NOT NULL OR listing IS NOT NULL OR address IS NOT NULL)',
  'ALTER TABLE showings ADD CONSTRAINT s_gallery CHECK (gallery IS NULL OR address IS NOT NULL)',
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
