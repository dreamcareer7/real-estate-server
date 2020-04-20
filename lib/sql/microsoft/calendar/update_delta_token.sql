UPDATE
  microsoft_calendars
SET
  delta_token = $2,
  updated_at = now()
WHERE
  id = $1
RETURNING id