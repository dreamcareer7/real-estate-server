SELECT room
FROM rooms_users
INNER JOIN rooms
    ON rooms_users.room = rooms.id
WHERE "user" = $1
    rooms_user.deleted_at IS NULL
    rooms.deleted_at IS NULL
    AND CASE WHEN $2 = 'Since_C' THEN rooms.created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
             WHEN $2 = 'Max_C' THEN rooms.created_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
             WHEN $2 = 'Since_U' THEN rooms.updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
             WHEN $2 = 'Max_U' THEN rooms.updated_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
             WHEN $2 = 'Init_C' THEN rooms.created_at < NOW()
             WHEN $2 = 'Init_U' THEN rooms.updated_at < NOW()
             ELSE TRUE
    END
ORDER BY
    CASE $2
        WHEN 'Since_C' THEN rooms.created_at
        WHEN 'Since_U' THEN rooms.updated_at
    END,
    CASE $2
        WHEN 'Max_C' THEN rooms.created_at
        WHEN 'Max_U' THEN rooms.updated_at
        WHEN 'Init_C' THEN rooms.created_at
        WHEN 'Init_U' THEN rooms.updated_at
    END DESC
LIMIT $4;
