WITH new_primary_attrs AS (
  SELECT
    id, attribute_def, contact
  FROM
    contacts_attributes
  WHERE
    id = ANY($1::uuid[])
), old_primary_attrs AS (
  SELECT
    contacts_attributes.id
  FROM
    contacts_attributes
    JOIN new_primary_attrs
      ON (
        contacts_attributes.contact = new_primary_attrs.contact
        AND contacts_attributes.attribute_def = new_primary_attrs.attribute_def
      )
  WHERE
    contacts_attributes.id <> new_primary_attrs.id
    AND contacts_attributes.deleted_at IS NULL
)
UPDATE
  contacts_attributes
SET
  is_primary = FALSE
FROM
  old_primary_attrs
WHERE
  contacts_attributes.id = old_primary_attrs.id
