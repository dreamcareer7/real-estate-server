UPDATE
  google_calendar_events
SET
  google_calendar = $2
WHERE
  id = ANY($1::uuid[])
RETURNING id,google_calendar,event_id