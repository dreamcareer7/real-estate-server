UPDATE
  google_credentials
SET
  calendars_last_sync_at = $2,
  sync_status = 'success',
  updated_at = now()
WHERE
  id = $1