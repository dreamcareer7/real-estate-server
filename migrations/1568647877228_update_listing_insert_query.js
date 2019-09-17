const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE listings ADD COULMN original_mls_property_type TEXT',
  'ALTER TABLE listings ADD COULMN original_mls_property_subtype TEXT',
  'ALTER TABLE listings ADD COULMN original_mls_status TEXT',

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
