UPDATE
  reminders
SET
  "time" = $3,
  is_relative = $4,
  "timestamp" = $5,
  updated_at = now()
WHERE
  task = $1
  AND id = $2
  AND deleted_at = NULL