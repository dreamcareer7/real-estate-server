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
  We dont have to run the below query:
  ALTER TABLE contacts DROP COLUMN IF EXISTS google_id

  Fix Query:
  update google_contacts
  set contact = contact_integration.contact
  from contact_integration
  where
  contact_integration.google_id = google_contacts.id
  and google_contacts.contact is null
  and google_contacts.deleted_at is not null;
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
