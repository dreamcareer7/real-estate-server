SELECT "user", ARRAY_AGG(notification) as notifications FROM notifications_users
WHERE
  acked_at IS NULL AND created_at < (NOW() - '2 minute'::interval)
  AND notification NOT IN(
    SELECT notification FROM notifications_deliveries -- Items in notifications_deliveries are already pushed to users once
  )
  AND "user" IN (
    SELECT DISTINCT "user" FROM notification_tokens -- Filter out users who have no devices registered
  )
GROUP BY "user"