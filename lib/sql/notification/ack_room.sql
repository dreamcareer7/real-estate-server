UPDATE notifications_users
SET
  acked_at = CLOCK_TIMESTAMP()
WHERE
  acked_at IS NULL
  AND "user" = $1
  AND notification IN
  (
    SELECT id FROM notifications WHERE room = $2
  )
