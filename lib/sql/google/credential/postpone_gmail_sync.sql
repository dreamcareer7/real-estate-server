UPDATE
  google_credentials
SET
  sync_status = 'failed',
  last_sync_at = now(),
  last_sync_duration = 0
WHERE
  id = $1
RETURNING id