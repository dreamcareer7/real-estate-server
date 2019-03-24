CREATE OR REPLACE FUNCTION get_search_field_for_contacts(contact_ids uuid[])
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
