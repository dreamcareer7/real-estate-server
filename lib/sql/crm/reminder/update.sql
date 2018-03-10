UPDATE
  reminders
SET
  is_relative = $3,
  "timestamp" = $4,
  updated_at = now()
WHERE
  task = $1
  AND id = $2
  AND deleted_at = NULL