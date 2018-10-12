CREATE OR REPLACE FUNCTION get_searchable_field_for_contacts(contact_ids uuid[])
RETURNS TABLE (
  contact uuid,
  searchable_field text
)
LANGUAGE SQL
STABLE
AS $$
  WITH t AS (
    SELECT
      contact, array_to_string(array_agg(text), ' ') as searchable_field
    FROM
      contacts_attributes
      JOIN contacts_attribute_defs ON contacts_attributes.attribute_def = contacts_attribute_defs.id
    WHERE
      contact = ANY(contact_ids)
      AND searchable IS True
      AND data_type = 'text'
      AND contacts_attributes.deleted_at IS NULL
      AND contacts_attribute_defs.deleted_at IS NULL
    GROUP BY
      contact
  )
  SELECT
    cids.id, COALESCE(t.searchable_field, 'Guest') AS searchable_field
  FROM
    unnest(contact_ids) cids(id)
    LEFT JOIN t
      ON t.contact = cids.id
$$
