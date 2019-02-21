const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE crm_tags DROP CONSTRAINT crm_tags_brand_tag_key',
  'CREATE UNIQUE INDEX crm_tags_brand_tag_key ON crm_tags (brand, tag) WHERE deleted_at IS NULL',
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
