CREATE OR REPLACE FUNCTION get_searchable_field_for_contacts(contact_ids uuid[])
RETURNS TABLE (
  contact uuid,
  searchable_field text
)
LANGUAGE SQL
STABLE
AS $$
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
$$