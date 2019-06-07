UPDATE
  google_contact_groups
SET
  deleted_at = $2
WHERE
  id = $1