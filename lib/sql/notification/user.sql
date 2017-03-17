WITH c AS (
  SELECT notifications.id AS id,
         (COUNT(*) OVER())::INT AS total,
         notifications.created_at,
         notifications.updated_at
  FROM notifications
  FULL JOIN notifications_users
    ON notifications.id = notifications_users.notification
  FULL JOIN rooms
    ON notifications.room = rooms.id
  WHERE
  (
    (
      notifications.room = ANY(SELECT room FROM rooms_users WHERE "user" = $1) AND
      COALESCE(notifications.exclude <> $1, TRUE)
    ) OR
    COALESCE(notifications.specific = $1, FALSE)
  ) AND
  notifications_users.acked_at IS NULL AND
  (
    (rooms.id IS NOT NULL AND rooms.deleted_at IS NULL) OR
    (rooms.id IS NULL)
  ) AND
  notifications.deleted_at IS NULL
)
SELECT id,
       total
FROM c
WHERE CASE
    WHEN $2 = 'Since_C' THEN created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Max_C' THEN created_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Since_U' THEN updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Max_U' THEN updated_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    ELSE TRUE
    END
ORDER BY
    CASE $2
        WHEN 'Since_C' THEN created_at
        WHEN 'Since_U' THEN updated_at
    END,
    CASE $2
        WHEN 'Max_C' THEN created_at
        WHEN 'Max_U' THEN updated_at
        WHEN 'Init_C' THEN created_at
        WHEN 'Init_U' THEN updated_at
    END DESC
LIMIT $4;
