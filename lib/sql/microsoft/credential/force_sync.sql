UPDATE
  microsoft_credentials
SET
  last_sync_at = null,
  sync_status = null,
  last_sync_duration = null
WHERE
  id = $1