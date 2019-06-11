UPDATE
  google_contact_groups
SET
  deleted_at = $3
WHERE
  id = $1
  AND google_credential = $2