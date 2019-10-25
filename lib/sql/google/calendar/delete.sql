UPDATE
  google_calendars
SET
  deleted_at = now()
WHERE
  id = $1