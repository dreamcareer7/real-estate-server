UPDATE notifications_users
SET
  acked_at = CLOCK_TIMESTAMP()
WHERE
  acked_at IS NULL
  AND "user" = $1
  -- If a list of specific notifications is provided, clear them away
  -- Otherwise, clear all notifications belonging to this user
  AND (
    (
      $2 IS NULL
      AND notification IN
      (
        SELECT id FROM notifications
        WHERE room IS NULL AND
        specific = $1 AND
        COALESCE(NOT ($1 = ANY(exclude)), TRUE)
      )
    )
    OR
    (
      $2 IS NOT NULL
      AND notification = ANY($2::uuid[])
    )
  )