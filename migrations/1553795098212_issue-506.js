const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE OR REPLACE FUNCTION generate_to_update(network TEXT) 
    RETURNS TABLE (
      id uuid,
      contact uuid
    )
    LANGUAGE SQL
    STABLE
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
      )
      SELECT * FROM to_update;
  $$`,

  `CREATE OR REPLACE FUNCTION issue_506_update_attributes(network TEXT) 
    RETURNS VOID
    LANGUAGE plpgsql
    AS $$
      BEGIN
        WITH to_update AS (
          SELECT * FROM generate_to_update(network)
        )
        UPDATE contacts_attributes
        SET
          attribute_def = (SELECT id FROM contacts_attribute_defs WHERE name = network AND global IS TRUE),
          attribute_type = network
        FROM
          to_update
        WHERE
          contacts_attributes.id = to_update.id;
      END;
  $$`,

  `CREATE OR REPLACE FUNCTION issue_506_update_search_field(contact_ids uuid[])
    RETURNS VOID
    LANGUAGE plpgsql
    VOLATILE
    AS $$
      BEGIN

        UPDATE
          contacts
        SET
          search_field = csf.search_field
        FROM
          get_search_field_for_contacts(contact_ids) csf
        WHERE
          id = csf.contact;

      END;
  $$`,

  `CREATE OR REPLACE VIEW affected_contacts_view_facebook AS
    SELECT contact FROM generate_to_update('facebook')`,

  `CREATE OR REPLACE VIEW affected_contacts_view_linkedin AS
    SELECT contact FROM generate_to_update('linkedin')`,

  `CREATE OR REPLACE VIEW affected_contacts_view_instagram AS
    SELECT contact FROM generate_to_update('instagram')`,

  `UPDATE contacts_attribute_defs SET
    singular = TRUE WHERE name = 'website'`,

  `SELECT
    issue_506_update_attributes('facebook')`,

  `SELECT
    issue_506_update_attributes('instagram')`,

  `SELECT
    issue_506_update_attributes('linkedin')`,

  `UPDATE contacts_attributes SET
    deleted_at = NOW() WHERE attribute_type='social'`,

  `UPDATE contacts_attribute_defs SET
    deleted_at = NOW() WHERE name = 'social'`,

  `WITH affected_contacts AS (
    SELECT array(
      SELECT contact FROM affected_contacts_view_facebook
        UNION ALL
      SELECT contact FROM affected_contacts_view_linkedin
        UNION ALL
      SELECT contact FROM affected_contacts_view_instagram
    ) AS ids
  )
  select i506usf.* from affected_contacts, issue_506_update_search_field(affected_contacts.ids) as i506usf`,

  `DROP VIEW
    affected_contacts_view_facebook`,

  `DROP VIEW
    affected_contacts_view_linkedin`,

  `DROP VIEW
    affected_contacts_view_instagram`,
  
  `DROP FUNCTION
    issue_506_update_attributes(TEXT)`,

  `DROP FUNCTION
    generate_to_update(TEXT)`,

  `DROP FUNCTION
    issue_506_update_search_field(uuid[])`,

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