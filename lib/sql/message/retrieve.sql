SELECT
    (COUNT(*) OVER())::INT AS full_count,
    id
FROM messages
WHERE message_room = $1
AND CASE WHEN $3 THEN created_at > to_timestamp($2)
                 ELSE created_at < to_timestamp($2)
    END
ORDER BY CASE WHEN $3 THEN created_at END,
         CASE WHEN NOT $3 THEN created_at END DESC
LIMIT $4
OFFSET $5
