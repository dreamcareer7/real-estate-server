SELECT id,
       (COUNT(*) OVER())::INT AS count
FROM messages
WHERE message_room = $1
AND CASE
    WHEN $3 = 'Since_C' THEN created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Max_C' THEN created_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Since_U' THEN updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Max_U' THEN updated_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Init_C' THEN created_at < NOW()
    WHEN $3 = 'Init_U' THEN updated_at < NOW()
    ELSE TRUE
    END
AND ((viewable_by = $2) OR (viewable_by IS NULL))
ORDER BY
    CASE $3
        WHEN 'Since_C' THEN created_at
        WHEN 'Since_U' THEN updated_at
    END,
    CASE $3
        WHEN 'Max_C' THEN created_at
        WHEN 'Max_U' THEN updated_at
        WHEN 'Init_C' THEN created_at
        WHEN 'Init_U' THEN updated_at
    END DESC
LIMIT $5;
