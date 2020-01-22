UPDATE
  microsoft_calendars
SET
  summary = $2,
  description = $3,
  location = $4,
  time_zone = $5,
  updated_at = now()
WHERE
  id = $1
RETURNING id