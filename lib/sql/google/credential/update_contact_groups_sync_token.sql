UPDATE
  google_credentials
SET
  contact_groups_sync_token = $2,
  updated_at = $3
WHERE
  id = $1