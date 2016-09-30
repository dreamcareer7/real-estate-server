SELECT 'message' AS type,
       *,
       (
         SELECT ARRAY_AGG(attachment)
         FROM attachments_eav
         WHERE object = $1
       ) AS attachments,

       (
        SELECT count(*) FROM notifications_users WHERE acked_at IS NOT NULL AND notification IN(
          SELECT id FROM notifications WHERE object_class = 'Message' AND object = $1
        )
       ) as ack_count,

       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM messages
WHERE id = $1
