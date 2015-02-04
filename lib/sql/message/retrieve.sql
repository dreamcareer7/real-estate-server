SELECT
    (COUNT(*) OVER())::INT AS full_count,
    id
FROM messages
WHERE message_room = $1
AND created_at > to_timestamp($2)
LIMIT $3
OFFSET $4
