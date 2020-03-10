UPDATE
  google_credentials
SET
  google_calendar = $2,
  updated_at = now(),
  calendars_last_sync_at = null
WHERE
  id = $1