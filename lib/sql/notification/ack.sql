UPDATE notifications_users
SET acked_at = NOW()
WHERE  "user" = $1 AND notification = $2