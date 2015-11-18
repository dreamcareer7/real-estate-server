SELECT notifications.id
FROM notifications
FULL JOIN notifications_acks
    ON notifications.id = notifications_acks.notification
WHERE notifications.room = ANY(SELECT room FROM rooms_users WHERE "user" = $1) AND
    notifications_acks.id IS NULL AND
    (COALESCE(notifications.exclude <> $1, TRUE) OR
     COALESCE(notifications.specific = $1, FALSE))
