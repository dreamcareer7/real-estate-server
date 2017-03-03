UPDATE notifications_users
SET acked_at = CLOCK_TIMESTAMP()
WHERE  "user" = $1 AND notification = $2
