const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE OR REPLACE FUNCTION issue_506_update_attributes(network TEXT) 
    RETURNS VOID
    LANGUAGE SQL
    VOLATILE
    AS $$

      WITH to_update AS (
        SELECT
          id, contact
        FROM
          contacts_attributes AS parent
        WHERE
          attribute_type='social'
          AND text LIKE '%' || network || '%'
          AND deleted_at IS NULL
          AND NOT EXISTS (
            SELECT
              id
            FROM
              contacts_attributes AS child
            WHERE
              child.attribute_type = network
              AND child.contact = parent.contact
              AND child.deleted_at IS NULL
          )

      ), update_attributes AS (
        UPDATE contacts_attributes
        SET
          attribute_def = (SELECT id FROM contacts_attribute_defs WHERE name = network AND global IS TRUE),
          attribute_type = network
        FROM
          to_update
        WHERE
          contacts_attributes.id = to_update.id
        RETURNING
          to_update.contact as affected_contact_ids

      ), affected_contacts AS (
        SELECT
          array_agg(DISTINCT affected_contact_ids) AS ids
        FROM
          update_attributes
      )

      UPDATE
        contacts
      SET
        search_field = csf.search_field
      FROM (
        SELECT
          contact, search_field
        FROM
          affected_contacts, get_search_field_for_contacts(affected_contacts.ids) gsf
      ) AS csf
      WHERE
        id = csf.contact;
    $$`,

  `SELECT
    issue_506_update_attributes('facebook')`,

  `SELECT
    issue_506_update_attributes('instagram')`,

  `SELECT
    issue_506_update_attributes('linkedin')`,

  `UPDATE contacts_attribute_defs SET
    singular = TRUE WHERE name = 'website'`,

  `UPDATE contacts_attributes SET
    deleted_at = NOW() WHERE attribute_type='social'`,

  `UPDATE contacts_attribute_defs SET
    deleted_at = NOW() WHERE name = 'social'`,

  `DROP FUNCTION
    issue_506_update_attributes(TEXT)`,

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