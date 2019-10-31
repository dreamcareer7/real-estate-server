UPDATE
  google_calendar_events
SET
  deleted_at = now(),
  updated_at = now()
WHERE
  google_credential = $1
  AND google_calendar = $2