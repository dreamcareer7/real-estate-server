WITH c AS (
  SELECT alerts.id AS id,
         (COUNT(*) OVER())::INT AS total,
         alerts.created_at AS created_at,
         alerts.updated_at AS updated_at
  FROM alerts
  INNER JOIN rooms_users
    ON alerts.room = rooms_users.room
  WHERE rooms_users."user" = $1 AND
        alerts.deleted_at IS NULL
)
SELECT id,
       total
FROM c
WHERE CASE
        WHEN $2 = 'Since_C' THEN created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
        WHEN $2 = 'Max_C' THEN created_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
        WHEN $2 = 'Since_U' THEN updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
        WHEN $2 = 'Max_U' THEN updated_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
        WHEN $2 = 'Init_C' THEN created_at <= NOW()
        WHEN $2 = 'Init_U' THEN updated_at <= NOW()
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
