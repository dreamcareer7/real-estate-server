SELECT 'message' AS type,
       *,
       (
         SELECT ARRAY_AGG(attachment)
         FROM attachments_eav
         WHERE object = $1
       ) AS attachments,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM messages
WHERE id = $1
