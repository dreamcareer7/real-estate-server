UPDATE
  microsoft_calendars
SET
  to_sync = $2,
  updated_at = now()
WHERE
  id = ANY($1::uuid[])
RETURNING id