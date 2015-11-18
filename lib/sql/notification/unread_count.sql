SELECT COUNT(*) AS total_count
FROM notifications
FULL JOIN notifications_acks
    ON notifications.id = notifications_acks.notification
WHERE notifications.room = ANY(SELECT room FROM rooms_users WHERE "user" = $1)
AND notifications_acks.id IS NULL
