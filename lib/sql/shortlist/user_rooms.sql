SELECT message_room
FROM message_rooms_users
INNER JOIN message_rooms
    ON message_rooms_users.message_room = message_rooms.id
WHERE "user" = $1
    AND message_rooms.shortlist = $2
    AND (SELECT COUNT(*) FROM messages WHERE message_room = message_rooms.id)::INT > 0
    AND CASE $3 WHEN 'Shortlist' THEN message_rooms.message_room_type = 'Shortlist'
                WHEN 'OneToOneMessaging' THEN message_rooms.message_room_type = 'OneToOneMessaging'
                WHEN 'Comment' THEN message_rooms.message_room_type = 'Comment'
                WHEN 'GroupMessaging' THEN message_rooms.message_room_type = 'GroupMessaging'
                WHEN 'Message' THEN message_rooms.message_room_type IN ('Shortlist', 'OneToOneMessaging', 'GroupMessaging')
                ELSE TRUE
    END
    AND CASE WHEN $4 = 'Since_C' THEN message_rooms.created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
             WHEN $4 = 'Max_C' THEN message_rooms.created_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
             WHEN $4 = 'Since_U' THEN message_rooms.updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
             WHEN $4 = 'Max_U' THEN message_rooms.updated_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
             ELSE TRUE
    END
ORDER BY
    CASE $4
        WHEN 'Since_C' THEN message_rooms.created_at
        WHEN 'Since_U' THEN message_rooms.updated_at
    END,
    CASE $4
        WHEN 'Max_C' THEN message_rooms.created_at
        WHEN 'Max_U' THEN message_rooms.updated_at
    END DESC
LIMIT $6;
