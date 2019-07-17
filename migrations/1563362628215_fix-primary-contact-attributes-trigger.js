const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP TRIGGER fix_is_primary_on_attr_insert_or_update ON contacts_attributes',
  'DROP FUNCTION clear_is_primary_on_other_attrs()',
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
