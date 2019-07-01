UPDATE
  microsoft_credentials
SET
  sync_status = 'sunccess',
  last_sync_at = $1,
  last_sync_duration = $2
WHERE
  id = $3
RETURNING id, sync_status