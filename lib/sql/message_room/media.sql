SELECT 'url' AS type,
       id,
       CASE WHEN $2 = 'Photo' THEN image_url
            WHEN $2 = 'Video' THEN video_url
            WHEN $2 = 'Document' THEN document_url
            ELSE image_url
       END AS url,
       CASE WHEN $2 = 'Photo' THEN 'photo'
            WHEN $2 = 'Video' THEN 'video'
            WHEN $2 = 'Document' THEN 'document'
            ELSE 'photo'
       END AS document_type
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
AND CASE
    WHEN $2 = 'Photo' THEN image_url IS NOT NULL
    WHEN $2 = 'Video' THEN video_url IS NOT NULL
    WHEN $2 = 'Document' THEN document_url IS NOT NULL
    ELSE image_url IS NOT NULL
    END
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
