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
  WHERE notifications.room = ANY (
    SELECT room
    FROM rooms_users
    WHERE "user" = $1
  ) AND notifications_acks.id IS NULL
    AND notifications.room IS NOT NULL
  GROUP BY notifications.room
) SELECT 'notification_summary' AS type,
         0 AS task_notification_count,
         0 AS transaction_notification_count,
         (0 + 0 + ARRAY_LENGTH(ARRAY_AGG(r), 1)) AS total_notification_count,
         JSON_AGG(r) AS room_notification_summaries from rn
