UPDATE
  google_calendars
SET
  watcher_status = $2,
  watcher = $3,
  updated_at = now()
WHERE
  id = $1
RETURNING id