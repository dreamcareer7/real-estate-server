UPDATE
  google_credentials
SET
  last_sync_at = $1
WHERE
  id = $2