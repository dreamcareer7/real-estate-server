UPDATE
  google_calendar_events
SET
  status = $4,
  updated_at = now()
WHERE
  google_credential = $1
  AND google_calendar = $2
  AND event_id = $3
RETURNING id