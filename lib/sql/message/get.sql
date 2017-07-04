SELECT 'message' AS type,
       messages.id AS mid,
       messages.id AS id,
       messages.*,
       (
         SELECT ARRAY_AGG(file)
         FROM files_relations
         WHERE role = 'Message' AND role_id = messages.id
       ) AS attachments,
       (
         SELECT ARRAY_AGG("user") FROM notifications_users WHERE acked_at IS NOT NULL AND notification IN
         (
           SELECT id FROM notifications WHERE object_class = 'Message' AND object = mid
           UNION
           SELECT notification FROM messages WHERE id = mid
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
            SELECT id FROM notifications WHERE object_class = 'Message' AND object = mid
            UNION
            SELECT notification FROM messages WHERE id = mid
          )
        ) d
       ) AS deliveries,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM messages
JOIN unnest($1::uuid[]) WITH ORDINALITY t(mid, ord) ON messages.id = mid
ORDER BY t.ord
