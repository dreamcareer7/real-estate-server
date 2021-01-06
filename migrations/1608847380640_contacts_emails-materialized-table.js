const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `
    CREATE TABLE contacts_emails AS (
      SELECT
        a.id,
        a.contact,
        a.label,
        a.is_primary,
        a.text AS email,
        a.is_partner,
        c.brand
      FROM
        contacts_attributes_text AS a
        JOIN contacts AS c
          ON c.id = a.contact
      WHERE
        c.deleted_at IS NULL
        AND a.deleted_at IS NULL
        AND a.attribute_type = 'email'
    )
  `,

  'ALTER TABLE contacts_emails ADD PRIMARY KEY ( id )',
  'ALTER TABLE contacts_emails ADD FOREIGN KEY ( brand ) REFERENCES brands ( id )',
  'CREATE INDEX contacts_emails_contact_idx ON contacts_emails ( contact, email )',
  'CREATE INDEX contacts_emails_brand_idx ON contacts_emails ( brand )',

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
