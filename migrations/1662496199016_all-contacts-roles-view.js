const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE OR REPLACE VIEW all_contacts_roles AS
     WITH owned_contacts AS (
       SELECT
         c.id AS role_contact,
         c.brand AS role_brand,
         c.user AS role_user,
         'owner'::contact_role as role_type
       FROM contacts AS c
       WHERE c.deleted_at IS NULL
         AND NOT c.parked
     )
     SELECT * FROM owned_contacts
     UNION ALL
     SELECT
       cr.contact AS role_contact,
       cr.brand AS role_brand,
       cr.user AS role_user,
       cr.role AS role_type
     FROM owned_contacts AS oc
     JOIN contacts_roles AS cr ON cr.contact = oc.role_contact
     WHERE cr.deleted_at IS NULL`,

  'DROP FUNCTION IF EXISTS check_contact_write_access(contacts, uuid, uuid)',
  'DROP FUNCTION IF EXISTS check_contact_write_access(contacts, uuid, uuid)',
  'DROP FUNCTION IF EXISTS check_contact_read_access(contacts, uuid, uuid)',
  'DROP FUNCTION IF EXISTS check_contact_read_access(contacts, uuid, uuid)',

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
