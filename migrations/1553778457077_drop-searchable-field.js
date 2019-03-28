const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE contacts DROP COLUMN searchable_field',
  'DROP FUNCTION IF EXISTS update_searchable_field_by_attribute_def',
  'DROP FUNCTION IF EXISTS get_searchable_field_for_contacts',
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
