const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE microsoft_contacts ADD COLUMN IF NOT EXISTS contact UUID NULL REFERENCES contacts(id)',

  'COMMIT'
]

/*
  ALTER TABLE contacts DROP COLUMN IF EXISTS microsoft_id

  UPDATE microsoft_contacts
  SET contact = contacts.id
  FROM contacts
  WHERE contacts.microsoft_id = microsoft_contacts.id 
  AND microsoft_contacts.microsoft_credential = 'b359f96c-0e85-4f91-aee2-c2af9b391e54'
*/

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
