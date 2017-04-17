SELECT notifications.id FROM notifications_users
JOIN notifications
  ON notifications_users.notification = notifications.id
FULL JOIN notifications_deliveries
  ON  notifications_users.notification = notifications_deliveries.notification
  AND notifications_users.user = notifications_deliveries.user
WHERE
  notifications_users.user = $1
  AND notifications.room = $2
  AND notifications_deliveries.id IS NULL
  AND notifications_users.acked_at IS NULL
