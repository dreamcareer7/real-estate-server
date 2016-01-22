SELECT notifications.id AS id,
       (COUNT(*) OVER())::INT AS total
FROM notifications
FULL JOIN notifications_acks
    ON notifications.id = notifications_acks.notification
INNER JOIN rooms
    ON notifications.room = rooms.id
WHERE notifications.room = ANY(SELECT room FROM rooms_users WHERE "user" = $1) AND
      notifications_acks.id IS NULL AND
      rooms.deleted_at IS NULL AND
      notifications.deleted_at IS NULL AND
      (COALESCE(notifications.exclude <> $1, TRUE) OR
      COALESCE(notifications.specific = $1, FALSE))
AND CASE
    WHEN $2 = 'Since_C' THEN notifications.created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Max_C' THEN notifications.created_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Since_U' THEN notifications.updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Max_U' THEN notifications.updated_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Init_C' THEN notifications.created_at <= CLOCK_TIMESTAMP()
    WHEN $2 = 'Init_U' THEN notifications.updated_at <= CLOCK_TIMESTAMP()
    ELSE TRUE
    END
ORDER BY
    CASE $2
        WHEN 'Since_C' THEN notifications.created_at
        WHEN 'Since_U' THEN notifications.updated_at
    END,
    CASE $2
        WHEN 'Max_C' THEN notifications.created_at
        WHEN 'Max_U' THEN notifications.updated_at
        WHEN 'Init_C' THEN notifications.created_at
        WHEN 'Init_U' THEN notifications.updated_at
    END DESC
LIMIT $4;
