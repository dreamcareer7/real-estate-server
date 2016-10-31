WITH issued_notification AS (
  SELECT id FROM notifications WHERE object_class = 'Message' AND object = $1
  UNION
  SELECT notification FROM messages WHERE id = $1
),

deliveries AS (
  SELECT
    "user",
    type AS delivery_type,
    'notification_delivery' as type,
    created_at
  FROM notifications_deliveries
  WHERE notification IN ( SELECT id FROM issued_notification )
)

SELECT 'message' AS type,
       *,
       (
         SELECT ARRAY_AGG(attachment)
         FROM attachments_eav
         WHERE object = $1
       ) AS attachments,

       (
        SELECT ARRAY_AGG("user") FROM notifications_users WHERE acked_at IS NOT NULL AND notification IN(
          SELECT id FROM issued_notification
        )
       ) AS acked_by,

       (
        SELECT JSON_AGG(deliveries) FROM deliveries
       ) AS deliveries,

       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM messages
WHERE id = $1
