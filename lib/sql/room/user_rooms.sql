WITH user_rooms AS (
    SELECT rooms_users.room AS id,
           (COUNT(*) OVER())::INT AS total,
           COALESCE(MAX(messages.created_at), MAX(rooms.created_at)) AS updated_at,
           MAX(rooms.created_at) AS created_at
           FROM rooms_users
           LEFT JOIN messages
               ON rooms_users.room = messages.room
           INNER JOIN rooms
               ON rooms_users.room = rooms.id
           WHERE "user" = $1 AND
               rooms.deleted_at IS NULL AND
               CASE WHEN ARRAY_LENGTH($5::room_type[], 1) IS NULL THEN TRUE ELSE rooms.room_type = ANY($5::room_type[]) END
           GROUP BY messages.room,
                    rooms_users.room
    )
SELECT id,
       total
FROM user_rooms
WHERE
   CASE WHEN $2 = 'Since_C' THEN user_rooms.created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
        WHEN $2 = 'Max_C' THEN user_rooms.created_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
        WHEN $2 = 'Since_U' THEN user_rooms.updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
        WHEN $2 = 'Max_U' THEN user_rooms.updated_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
        WHEN $2 = 'Init_C' THEN user_rooms.created_at <= NOW()
        WHEN $2 = 'Init_U' THEN user_rooms.updated_at <= NOW()
        ELSE TRUE
   END
ORDER BY
    CASE $2
        WHEN 'Since_C' THEN user_rooms.created_at
        WHEN 'Since_U' THEN user_rooms.updated_at
    END,
    CASE $2
        WHEN 'Max_C' THEN user_rooms.created_at
        WHEN 'Max_U' THEN user_rooms.updated_at
        WHEN 'Init_C' THEN user_rooms.created_at
        WHEN 'Init_U' THEN user_rooms.updated_at
    END DESC
LIMIT $4;
