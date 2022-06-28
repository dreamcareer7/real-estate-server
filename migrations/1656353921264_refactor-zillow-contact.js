const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE UNIQUE INDEX zillow_contact_unique ON zillow_contacts(contact)',
  'ALTER TABLE zillow_contacts DROP COLUMN client_guid',
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
