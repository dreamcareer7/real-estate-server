WITH uc AS (
  UPDATE
    contacts
  SET
    updated_at = now()
  WHERE
    id = $1
)
UPDATE
  contacts_attributes
SET
  deleted_at = now()
WHERE
  contact = $1
  AND id = $2
