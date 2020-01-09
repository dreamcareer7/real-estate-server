UPDATE
  microsoft_calendar_events
SET
  status = 'canceled',
  deleted_at = now(),
  updated_at = now()
WHERE
  microsoft_credential = $1
  AND microsoft_calendar = $2
  AND event_id = ANY($3::text[])
RETURNING id