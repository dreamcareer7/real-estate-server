UPDATE
  reminders
SET
  needs_notification = $2
WHERE
  id = $1
  AND deleted_at IS NULL
