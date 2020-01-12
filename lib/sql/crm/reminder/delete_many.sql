UPDATE
  reminders
SET
  deleted_at = CLOCK_TIMESTAMP()
WHERE
  id = ANY($1::uuid[])
-- RETURNING
--   "notification"
