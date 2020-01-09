UPDATE
  microsoft_calendars
SET
  deleted_at = now(),
  updated_at = now()
WHERE
  microsoft_credential = $1
  AND calendar_id = $2