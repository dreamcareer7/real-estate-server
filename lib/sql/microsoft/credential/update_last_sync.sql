UPDATE
  microsoft_credentials
SET
  sync_status = 'success',
  last_sync_duration = $2,
  last_sync_at = $3,
  updated_at = now()
WHERE
  id = $1
RETURNING id, sync_status