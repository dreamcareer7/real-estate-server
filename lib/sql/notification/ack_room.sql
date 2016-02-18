WITH rn AS (
  SELECT notifications.id AS id
  FROM notifications
  FULL JOIN notifications_acks
    ON notifications_acks.notification = notifications.id
  INNER JOIN rooms
    ON notifications.room = rooms.id
  WHERE notifications.room = $2 AND
        notifications_acks.id IS NULL AND
  rooms.deleted_at IS NULL AND
  (COALESCE(notifications.exclude <> $1, TRUE) OR
  COALESCE(notifications.specific = $1, FALSE))
)
INSERT INTO notifications_acks(
                                "user",
                                notification
                               )
(SELECT $1, id FROM rn)
ON CONFLICT DO NOTHING
