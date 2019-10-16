UPDATE
  google_calendar_events
SET
  deleted_at = now()
WHERE
  id = $1