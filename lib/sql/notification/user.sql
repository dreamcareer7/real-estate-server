SELECT notifications.id
FROM notifications
FULL JOIN notifications_acks
    ON notifications.id = notifications_acks.notification
INNER JOIN rooms
    ON notifications.room = rooms.id
WHERE notifications.room = ANY(SELECT room FROM rooms_users WHERE "user" = $1) AND
      notifications_acks.id IS NULL AND
      rooms.deleted_at IS NULL AND
      (COALESCE(notifications.exclude <> $1, TRUE) OR
      COALESCE(notifications.specific = $1, FALSE))
