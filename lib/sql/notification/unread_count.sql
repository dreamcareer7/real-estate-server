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
) SELECT 'notification_summary' AS type,
         0 AS task_notification_count,
         0 AS transaction_notification_count,
         (0 + 0 + COALESCE(ARRAY_LENGTH(ARRAY_AGG(r), 1), 0)) AS total_notification_count,
         COALESCE(ARRAY_AGG(r), '{}'::json[]) AS room_notification_summaries from rn
