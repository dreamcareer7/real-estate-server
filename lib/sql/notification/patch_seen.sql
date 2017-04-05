UPDATE notifications_users
SET seen_at = CLOCK_TIMESTAMP()
WHERE "user" = $1 AND
      notification = $2
