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
  We dont have to run the below query:
  ALTER TABLE contacts DROP COLUMN IF EXISTS microsoft_id
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
