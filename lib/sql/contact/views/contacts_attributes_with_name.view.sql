CREATE OR REPLACE VIEW contacts_attributes_with_name AS (
  SELECT
    contacts_attributes.*,
    contacts_attribute_defs.name
  FROM contacts_attributes
  INNER JOIN contacts_attribute_defs
    ON contacts_attributes.attribute_def = contacts_attribute_defs.id
  WHERE
    contacts_attribute_defs.deleted_at IS NULL
    AND contacts_attributes.deleted_at IS NULL
)