UPDATE
  reminders
SET
  deleted_at = CLOCK_TIMESTAMP()
WHERE
  deleted_at IS NULL
  AND id = $1