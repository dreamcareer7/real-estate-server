WITH rn AS (
  SELECT notifications.id AS id
  FROM notifications
  FULL JOIN notifications_acks
    ON notifications_acks.notification = notifications.id
  WHERE notifications.specific = $1 AND
        notifications_acks.id IS NULL AND
        notifications.room IS NULL AND
        (
          notifications.object_class = 'Task' OR
          notifications.subject_class = 'Task'
        )
)
INSERT INTO notifications_acks(
                                "user",
                                notification
                               )
(SELECT $1, id FROM rn)
ON CONFLICT DO NOTHING
