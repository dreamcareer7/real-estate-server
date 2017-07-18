SELECT
  notifications.room,
  notifications_users.user,
  EXTRACT( -- Time of the first unread notification for this user on this room.
    EPOCH FROM ((array_agg(notifications.created_at ORDER BY notifications.created_at))[1]::timestamptz)
  ) as first_unread,

  EXTRACT( -- Time of the last unread notification for this user on this room.
    EPOCH FROM ((array_agg(notifications.created_at ORDER BY notifications.created_at DESC))[1]::timestamptz)
  ) as last_unread
FROM notifications
JOIN notifications_users      ON notifications.id = notifications_users.notification
FULL JOIN
  notifications_deliveries ON
    notifications.id = notifications_deliveries.notification AND 
    notifications_users.user = notifications_deliveries.user
WHERE
  notifications_users.created_at <= (NOW() - $1::interval)
  AND notifications_users.created_at >= (NOW() - $2::interval)
  AND notifications_users.acked_at IS NULL
  AND notifications.room IS NOT NULL
  AND notifications_deliveries.id IS NULL
GROUP BY notifications_users.user, notifications.room;