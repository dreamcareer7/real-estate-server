UPDATE
  google_credentials
SET
  calendars_last_sync_at = now()
  updated_at = now()
WHERE
  id = $1