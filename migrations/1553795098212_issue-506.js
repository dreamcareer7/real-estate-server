const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `UPDATE contacts_attribute_defs
    SET singular = TRUE WHERE name = 'website'`,

  `UPDATE contacts_attributes
    SET deleted_at = NOW() WHERE attribute_type='social'`,

  `UPDATE contacts_attribute_defs
    SET deleted_at = NOW() WHERE name = 'social'`,

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