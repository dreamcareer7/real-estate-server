WITH rn AS (
  SELECT notifications.id AS id
  FROM notifications
  FULL JOIN notifications_acks
    ON notifications_acks.notification = notifications.id
  WHERE notifications.specific = $2 AND
        notifications_acks.id IS NULL AND
        notifications.room IS NULL AND
        (
          notifications.object_class = 'Transaction' OR
          notifications.subject_class = 'Transaction'
        ) AND
        (
          notifications.object = $1 OR
          notifications.subject = $1
        )
)
INSERT INTO notifications_acks(
                                "user",
                                notification
                               )
(SELECT $2, id FROM rn)
ON CONFLICT DO NOTHING
