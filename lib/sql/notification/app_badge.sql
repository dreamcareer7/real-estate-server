WITH c AS (
    SELECT rooms_users.room AS id,
           (COUNT(*) OVER())::INT AS total,
           COALESCE(MAX(messages.created_at), MAX(rooms.updated_at)) AS updated_at,
           MAX(rooms.created_at) AS created_at
    FROM rooms_users
    LEFT JOIN messages
      ON rooms_users.room = messages.room
    INNER JOIN rooms
      ON rooms_users.room = rooms.id
    WHERE "user" = $1 AND
          rooms.deleted_at IS NULL AND
          rooms_users.archived IS FALSE
    GROUP BY messages.room,
             rooms_users.room
)
SELECT (COUNT(DISTINCT(notifications.room)) + COUNT(notifications_users."user") FILTER (WHERE notifications.room IS NULL))::INT AS app_badge
FROM notifications_users
INNER JOIN notifications
  ON notifications_users.notification = notifications.id
WHERE
  notifications_users."user" = $1 AND
  notifications_users.acked_at IS NULL AND
  notifications.deleted_at IS NULL AND
  COALESCE(notifications.exclude <> $1, TRUE)
