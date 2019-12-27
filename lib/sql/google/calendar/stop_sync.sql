UPDATE
  google_calendars
SET
  watcher_status = 'stopped',
  updated_at = now()
WHERE
  google_credential = $1
  AND calendar_id = ANY($2::uuid[])
RETURNING id