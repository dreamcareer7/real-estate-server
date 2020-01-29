UPDATE
  google_calendar_events
SET
  status = 'confirmed',
  deleted_at = null,
  updated_at = now()
WHERE
  google_credential = $1
  AND google_calendar = $2
  AND event_id = ANY($3::text[])
RETURNING id