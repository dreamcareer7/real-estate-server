UPDATE
  microsoft_calendar_events
SET
  deleted_at = now(),
  updated_at = now()
WHERE
  microsoft_credential = $1
  AND microsoft_calendar = $2