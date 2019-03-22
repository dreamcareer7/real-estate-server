const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE contacts ADD COLUMN IF NOT EXISTS search_field tsvector',
  `CREATE OR REPLACE FUNCTION get_search_field_for_contacts(contact_ids uuid[])
    RETURNS TABLE (
      contact uuid,
      search_field tsvector
    )
    LANGUAGE SQL
    STABLE
    AS $$
      WITH p1 AS (
        SELECT
          contact,
          array_to_string(array_agg(text), ' ') as search_field
        FROM
          contacts_attributes
        WHERE
          contact = ANY(contact_ids)
          AND contacts_attributes.deleted_at IS NULL
          AND (attribute_type = 'first_name' OR attribute_type = 'last_name' OR attribute_type = 'email' OR attribute_type = 'phone_number')
          AND is_partner IS FALSE
        GROUP BY
          contact
      ), p2 AS (
        SELECT
          contact,
          array_to_string(array_agg(text), ' ') as search_field
        FROM
          contacts_attributes
        WHERE
          contact = ANY(contact_ids)
          AND contacts_attributes.deleted_at IS NULL
          AND (
            (is_partner IS TRUE AND (attribute_type = 'first_name' OR attribute_type = 'last_name' OR attribute_type = 'email' OR attribute_type = 'phone_number'))
            OR attribute_type = 'marketing_name'
            OR attribute_type = 'middle_name'
          )
        GROUP BY
          contact
      ), p3 AS (
        SELECT
          contact,
          array_to_string(array_agg(text), ' ') as search_field
        FROM
          contacts_attributes
          JOIN contacts_attribute_defs ON contacts_attributes.attribute_def = contacts_attribute_defs.id
        WHERE
          contact = ANY(contact_ids)
          AND searchable IS True
          AND data_type = 'text'
          AND contacts_attributes.deleted_at IS NULL
          AND contacts_attribute_defs.deleted_at IS NULL
          AND attribute_type <> ALL('{
            first_name,
            middle_name,
            last_name,
            marketing_name,
            email,
            phone_number
          }')
        GROUP BY
          contact
      ), combined AS (
        SELECT
          COALESCE(p1.contact, COALESCE(p2.contact, p3.contact)) AS contact,
          (setweight(to_tsvector('simple', COALESCE(p1.search_field, '')), 'A')
          || setweight(to_tsvector('simple', COALESCE(p2.search_field, '')), 'B')
          || setweight(to_tsvector('simple', COALESCE(p3.search_field, '')), 'C')) AS search_field
        FROM
          p1
          FULL OUTER JOIN p2
            ON p1.contact = p2.contact
          FULL OUTER JOIN p3
            ON COALESCE(p1.contact, p2.contact) = p3.contact
      )
      SELECT
        cids.id,
        COALESCE(search_field, setweight(to_tsvector('simple', 'Guest'), 'D')) AS search_field
      FROM
        unnest(contact_ids) cids(id)
        LEFT JOIN combined
          ON combined.contact = cids.id
    $$
  `,
  `CREATE OR REPLACE FUNCTION delete_contact_attribute_def(id uuid, user_id uuid)
    RETURNS setof uuid
    LANGUAGE plpgsql
    AS $$
      DECLARE
        searchable boolean;
        affected_contacts uuid[];
      BEGIN
        UPDATE
          contacts_attribute_defs
        SET
          deleted_at = now(),
          deleted_by = user_id
        WHERE
          contacts_attribute_defs.id = $1
        RETURNING
          contacts_attribute_defs.searchable INTO searchable;
    
        WITH uca AS (
          UPDATE  /* We should delete contact attributes with the deleted attribute_def */
            contacts_attributes
          SET
            deleted_at = now(),
            deleted_by = user_id
          WHERE
            attribute_def = $1
          RETURNING
            contact
        )
        SELECT array_agg(DISTINCT contact) INTO affected_contacts FROM uca;
    
        IF searchable THEN
          UPDATE
            contacts
          SET
            updated_at = NOW(),
            updated_by = user_id,
            search_field = csf.search_field
          FROM
            get_search_field_for_contacts(affected_contacts) csf
          WHERE
            contacts.id = csf.contact;
        ELSE
          UPDATE  /* Set updated_at for affected contacts */
            contacts
          SET
            updated_at = now(),
            updated_by = user_id
          WHERE
            contacts.id = ANY(affected_contacts);
        END IF;
    
        RETURN QUERY SELECT * FROM unnest(affected_contacts) AS t(id);
      END;
    $$
  `,
  `CREATE OR REPLACE FUNCTION update_contact_summaries_from_contact() RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
      BEGIN
        UPDATE
          contacts_summaries AS cs
        SET
          "user" = uc."user",
          brand = uc.brand,
          updated_at = uc.updated_at,
          display_name = uc.display_name,
          sort_field = uc.sort_field,
          partner_name = uc.partner_name,
          search_field = uc.search_field,
          next_touch = uc.next_touch,
          last_touch = uc.last_touch
        FROM
          updated_contacts uc
        WHERE
          uc.id = cs.id
          AND uc.deleted_at IS NULL;
    
        RETURN NULL;
      END;
    $$
  `,
  `WITH p1 AS (
    SELECT
      contact,
      array_to_string(array_agg(text), ' ') as search_field
    FROM
      contacts_attributes
    WHERE
      contacts_attributes.deleted_at IS NULL
      AND (attribute_type = 'first_name' OR attribute_type = 'last_name' OR attribute_type = 'email' OR attribute_type = 'phone_number')
      AND is_partner IS FALSE
    GROUP BY
      contact
  ), p2 AS (
    SELECT
      contact,
      array_to_string(array_agg(text), ' ') as search_field
    FROM
      contacts_attributes
    WHERE
      contacts_attributes.deleted_at IS NULL
      AND (
        (is_partner IS TRUE AND (attribute_type = 'first_name' OR attribute_type = 'last_name' OR attribute_type = 'email' OR attribute_type = 'phone_number'))
        OR attribute_type = 'marketing_name'
        OR attribute_type = 'middle_name'
      )
    GROUP BY
      contact
  ), p3 AS (
    SELECT
      contact,
      array_to_string(array_agg(text), ' ') as search_field
    FROM
      contacts_attributes
      JOIN contacts_attribute_defs ON contacts_attributes.attribute_def = contacts_attribute_defs.id
    WHERE
      searchable IS True
      AND data_type = 'text'
      AND contacts_attributes.deleted_at IS NULL
      AND contacts_attribute_defs.deleted_at IS NULL
      AND attribute_type <> ALL('{
        first_name,
        middle_name,
        last_name,
        marketing_name,
        email,
        phone_number
      }')
    GROUP BY
      contact
  ), combined AS (
    SELECT
      p1.contact,
      (setweight(to_tsvector('simple', COALESCE(p1.search_field, '')), 'A')
      || setweight(to_tsvector('simple', COALESCE(p2.search_field, '')), 'B')
      || setweight(to_tsvector('simple', COALESCE(p3.search_field, '')), 'C')) AS search_field
    FROM
      p1
      FULL OUTER JOIN p2
        ON p1.contact = p2.contact
      FULL OUTER JOIN p3
        ON COALESCE(p1.contact, p2.contact) = p3.contact
      )
  UPDATE
    contacts
  SET
    search_field = COALESCE(combined.search_field, setweight(to_tsvector('simple', 'Guest'), 'D'))
  FROM
    combined
  WHERE
    contacts.id = combined.contact
  `,
  `UPDATE
    contacts_summaries AS cs
  SET
    search_field = c.search_field
  FROM
    contacts AS c
  WHERE
    cs.id = c.id`,
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
