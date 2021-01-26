const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE google_contacts ADD COLUMN IF NOT EXISTS contact UUID NULL REFERENCES contacts(id)',

  `UPDATE google_contacts
    SET contact = contacts.id
    FROM contacts
    WHERE contacts.google_id = google_contacts.id`,

  'COMMIT'
]

/*
  DROP NOT NULL on google_contacts.contact

  We dont have to run the below query:
  ALTER TABLE contacts DROP COLUMN IF EXISTS google_id
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
