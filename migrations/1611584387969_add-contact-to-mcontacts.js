const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE microsoft_contacts ADD COLUMN IF NOT EXISTS contact UUID NULL REFERENCES contacts(id)',

  `UPDATE microsoft_contacts
    SET contact = contacts.id
    FROM contacts
    WHERE contacts.microsoft_id = microsoft_contacts.id`,

  'COMMIT'
]

/*
  ALTER TABLE contacts DROP COLUMN IF EXISTS microsoft_id

  UPDATE microsoft_contacts
  SET contact = contacts.id
  FROM contacts
  WHERE contacts.microsoft_id = microsoft_contacts.id
  AND microsoft_contacts.microsoft_credential = '2d03fe0f-97ce-4d9b-bd63-329d29a1710b'
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
