UPDATE
  google_calendars
SET
  sync_token = null,
  watcher_status = null,
  watcher_channel_id = null,
  watcher = null,
  deleted = true,
  deleted_at = now(),
  updated_at = now()
WHERE
  google_credential = $1
  AND calendar_id = $2