const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP FUNCTION IF EXISTS check_contact_write_access(contacts, uuid, uuid)',
  'DROP FUNCTION IF EXISTS check_contact_write_access(contacts, uuid, uuid)',
  'DROP FUNCTION IF EXISTS check_contact_read_access(contacts, uuid, uuid)',
  'DROP FUNCTION IF EXISTS check_contact_read_access(contacts, uuid, uuid)',
  'DROP FUNCTION IF EXISTS check_contact_delete_access',
  'COMMIT',
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
