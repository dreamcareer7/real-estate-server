SELECT
    (COUNT(*) OVER())::INT AS full_count,
    'message' AS type,
    *,
    EXTRACT(EPOCH FROM created_at)::INT AS created_at,
    EXTRACT(EPOCH FROM updated_at)::INT AS updated_at
FROM messages
WHERE message_room = $1
AND created_at > to_timestamp($2)
LIMIT $3
OFFSET $4
