const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE contacts
    ADD COLUMN title text,
    ADD COLUMN first_name text,
    ADD COLUMN middle_name text,
    ADD COLUMN last_name text,
    ADD COLUMN marketing_name text,
    ADD COLUMN nickname text,
    ADD COLUMN email text[],
    ADD COLUMN phone_number text[],
    ADD COLUMN tag text[],
    ADD COLUMN website text[],
    ADD COLUMN company text,
    ADD COLUMN birthday timestamptz,
    ADD COLUMN profile_image_url text,
    ADD COLUMN cover_image_url text,
    ADD COLUMN job_title text,
    ADD COLUMN source_type text,
    ADD COLUMN source text
  `,
  'DROP TRIGGER update_contact_summaries_on_contact_update ON contacts',
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
