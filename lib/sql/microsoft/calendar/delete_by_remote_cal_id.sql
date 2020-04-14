UPDATE
  microsoft_calendars
SET
  to_sync = false,
  delta_token = null,
  deleted_at = now(),
  updated_at = now()
WHERE
  microsoft_credential = $1
  AND calendar_id = $2