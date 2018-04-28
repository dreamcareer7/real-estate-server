UPDATE notifications_users
SET seen_at = CLOCK_TIMESTAMP()
WHERE "user" = $1 AND
      (notification = ANY($2::uuid[]) AND NOT $3) OR $3
