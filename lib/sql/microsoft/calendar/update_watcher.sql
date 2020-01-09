UPDATE
  microsoft_calendars
SET
  watcher_status = $2,
  watcher_channel_id = $3,
  watcher = $4,
  updated_at = now()
WHERE
  id = $1
RETURNING id