UPDATE
  google_credentials
SET
  calendars_last_sync_at = null
WHERE
  id = $1