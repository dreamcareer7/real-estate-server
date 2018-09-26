UPDATE
  reminders
SET
  is_relative = $3,
  "timestamp" = $4,
  updated_at = now(),
  needs_notification = (CASE
    WHEN $4::timestamptz <> "timestamp" THEN
      $4::timestamptz > now()
    ELSE
      needs_notification
    END) AND $5::boolean
WHERE
  task = $1
  AND id = $2
  AND deleted_at IS NULL
