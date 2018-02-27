UPDATE
  reminders
SET
  notification = $2
WHERE
  AND id = $1
  AND deleted_at = NULL