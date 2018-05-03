WITH u AS (
  UPDATE
    contacts_attribute_defs
  SET
    deleted_at = now()
  WHERE
    id = $1
)
UPDATE  /* We should delete contact attributes with the deleted attribute_def */
  contacts_attributes
SET
  deleted_at = now()
WHERE
  attribute_def = $1
RETURNING
  id, contact
