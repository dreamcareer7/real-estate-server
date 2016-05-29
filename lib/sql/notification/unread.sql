SELECT
  notifications_users."user",
  ARRAY_AGG(notifications_users.notification) as notifications
FROM notifications_users
LEFT OUTER JOIN notifications_deliveries
  ON notifications_users.notification = notifications_deliveries.notification
  AND notifications_users.user = notifications_deliveries.user
WHERE
  notifications_deliveries.notification IS NULL AND
  notifications_users.acked_at IS NULL
  AND notifications_users.created_at < (NOW() - '2 minute'::interval)
  AND notifications_users.user IN (
    SELECT DISTINCT "user" FROM notification_tokens
  )
GROUP BY notifications_users."user"