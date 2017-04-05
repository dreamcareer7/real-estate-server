WITH c AS (
  SELECT notifications.id AS id,
         (COUNT(*) OVER())::INT AS total,
         created_at,
         updated_at
  FROM notifications
  WHERE notifications.deleted_at IS NULL AND
        notifications.room IS NULL AND
        notifications.specific = $1 AND
        COALESCE(notifications.exclude <> $1, TRUE)
)
SELECT id,
       total,
       (
         SELECT COUNT(*)::INT FROM notifications_users WHERE "user" = $1 AND notification IN (SELECT id FROM c) AND acked_at IS NULL
       ) AS new
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
        WHEN 'Init_C' THEN created_at
        WHEN 'Init_U' THEN updated_at
    END,
    CASE $2
        WHEN 'Max_C' THEN created_at
        WHEN 'Max_U' THEN updated_at
        WHEN 'Init_C' THEN created_at
        WHEN 'Init_U' THEN updated_at
    END DESC
LIMIT $4
