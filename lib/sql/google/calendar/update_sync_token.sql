UPDATE
  google_calendars
SET
  sync_token = $2,
  updated_at = now()
WHERE
  id = $1
RETURNING id