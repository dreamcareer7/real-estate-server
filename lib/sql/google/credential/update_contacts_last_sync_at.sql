UPDATE
  google_credentials
SET
  contacts_last_sync_at = $2,
  updated_at = $2
WHERE
  id = $1