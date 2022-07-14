const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS contacts_attributes_tag_contact_idx ON contacts_attributes_text (contact) WHERE attribute_type = \'tag\' AND deleted_at IS NULL',
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
