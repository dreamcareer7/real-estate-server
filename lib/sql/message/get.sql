SELECT 'message' AS type,
       messages.*,
       (
         SELECT ARRAY_AGG(attachment)
         FROM attachments_eav
         WHERE object = messages.id
       ) AS attachments,
       (
         SELECT ARRAY_AGG("user") FROM notifications_users WHERE acked_at IS NOT NULL AND notification IN
         (
           SELECT id FROM notifications WHERE object_class = 'Message' AND object = messages.id
           UNION
           SELECT notification FROM messages WHERE id = messages.id
         )
       ) AS acked_by,
       (
        SELECT JSON_AGG(d.*) FROM
        (
          SELECT "user",
                 type AS delivery_type,
                 'notification_delivery' as type,
                 created_at
          FROM notifications_deliveries
          WHERE notification IN
          (
            SELECT id FROM notifications WHERE object_class = 'Message' AND object = messages.id
            UNION
            SELECT notification FROM messages WHERE id = messages.id
          )
        ) d
       ) AS deliveries,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM messages
JOIN unnest($1::uuid[]) WITH ORDINALITY t(mid, ord) ON messages.id = mid
ORDER BY t.ord
