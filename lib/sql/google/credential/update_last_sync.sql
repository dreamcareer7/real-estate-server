UPDATE
  google_credentials
SET
  last_sync_at = $1,
  last_sync_duration = $2
WHERE
  id = $3