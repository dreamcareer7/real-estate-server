UPDATE
  google_calendar_events
SET
  status = 'canceled',
  deleted_at = now(),
  updated_at = now()
WHERE
  id = ANY($1::uuid[])
RETURNING id