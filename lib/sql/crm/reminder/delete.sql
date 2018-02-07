UPDATE
  reminders
SET
  deleted_at = CLOCK_TIMESTAMP()
WHERE
  deleted_at = NULL
  AND id = $2