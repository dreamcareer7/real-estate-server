WITH rn AS (
  SELECT JSON_BUILD_OBJECT(
    'type', 'room_notification_summary',
    'room_id', notifications.room,
    'system_generated_count', COUNT(notifications.id) FILTER (
      WHERE notifications.action = ANY('{"PriceDropped", "StatusChanged", "BecameAvailable"}')
    ),
    'user_generated_count', COUNT(notifications.id) FILTER (
      WHERE NOT (notifications.action = ANY('{"PriceDropped", "StatusChanged", "BecameAvailable"}'))
    )
  ) AS r
  FROM notifications
  FULL JOIN notifications_acks
    ON notifications.id = notifications_acks.notification
  INNER JOIN rooms
    ON notifications.room = rooms.id
  WHERE notifications.room = ANY (SELECT room FROM rooms_users WHERE "user" = $1) AND
    notifications_acks.id IS NULL AND
    notifications.room IS NOT NULL AND
    rooms.deleted_at IS NULL AND
    (COALESCE(notifications.exclude <> $1, TRUE) OR
    COALESCE(notifications.specific = $1, FALSE))
  GROUP BY notifications.room
),
tc AS (
  SELECT tasks.id AS task
  FROM notifications
  FULL JOIN notifications_acks
    ON notifications.id = notifications_acks.notification
  INNER JOIN tasks
    ON (notifications.object = tasks.id OR notifications.subject = tasks.id)
  WHERE notifications.specific = $1 AND
        notifications_acks.id IS NULL AND
        notifications.room IS NULL AND
        (
          notifications.object_class = 'Task' OR
          notifications.subject_class = 'Task'
        )
),
trc AS (
  SELECT transactions.id AS transaction
  FROM notifications
  FULL JOIN notifications_acks
    ON notifications.id = notifications_acks.notification
  INNER JOIN transactions
    ON (notifications.object = transactions.id OR notifications.subject = transactions.id)
  WHERE notifications.specific = $1 AND
        notifications_acks.id IS NULL AND
        notifications.room IS NULL AND
        (
          notifications.object_class = 'Transaction' OR
          notifications.subject_class = 'Transaction'
        )
)
SELECT 'notification_summary' AS type,
       (SELECT COUNT(*) FROM tc) AS task_notification_count,
       (SELECT COUNT(*) FROM trc) AS transaction_notification_count,
       ((SELECT COUNT(*) FROM tc) + (SELECT COUNT(*) FROM trc) + COALESCE(ARRAY_LENGTH(ARRAY_AGG(r), 1), 0)) AS total_notification_count,
       COALESCE((SELECT ARRAY_AGG(task) from tc), '{}'::uuid[]) AS task_ids,
       COALESCE((SELECT ARRAY_AGG(transaction) from trc), '{}'::uuid[]) AS transaction_ids,
       COALESCE(ARRAY_AGG(r), '{}'::json[]) AS room_notification_summaries
FROM rn
