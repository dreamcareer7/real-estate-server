UPDATE
  google_credentials
SET
  last_contact_groups_sync_at = $1
WHERE
  id = $2