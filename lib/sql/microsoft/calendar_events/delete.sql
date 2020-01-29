UPDATE
  microsoft_calendar_events
SET
  deleted_at = now(),
  updated_at = now()
WHERE
  id = $1