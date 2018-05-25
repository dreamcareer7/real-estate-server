CREATE OR REPLACE FUNCTION update_searchable_field_by_attribute_def(attribute_def_id uuid)
RETURNS void
LANGUAGE SQL
AS $$
  UPDATE
    contacts
  SET
    searchable_field = csf.searchable_field
  FROM (
    SELECT
      contact, array_to_string(array_agg(text), ' ') as searchable_field
    FROM
      contacts_attributes
      JOIN contacts_attribute_defs ON contacts_attributes.attribute_def = contacts_attribute_defs.id
    WHERE
      contacts_attribute_defs.id = attribute_def_id
      AND searchable IS True
      AND data_type = 'text'
      AND contacts_attributes.deleted_at IS NULL
      AND contacts_attribute_defs.deleted_at IS NULL
    GROUP BY
      contact
  ) csf
  WHERE
    contacts.id = csf.contact
$$