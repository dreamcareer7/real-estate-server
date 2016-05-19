WITH recs AS (
  SELECT recommendations.id,
         recommendations.hidden,
         recommendations.created_at,
         recommendations.referring_objects,
         COUNT(messages.id) FILTER (WHERE messages.id IS NOT NULL) AS message_count,
         MAX(messages.created_at) FILTER (WHERE messages.id IS NOT NULL) AS updated_at
  FROM recommendations
  FULL JOIN messages ON messages.recommendation = recommendations.id
  WHERE recommendations.room IN
        (
          SELECT room
          FROM rooms_users
          WHERE "user" = $1
        ) AND
        recommendations.deleted_at IS NULL AND
        recommendations.hidden = FALSE
  GROUP BY recommendations.id,
           recommendations.hidden,
           recommendations.created_at,
           recommendations.referring_objects
)
SELECT id,
       (COUNT(*) OVER())::INT AS total,
       LOWER($2),
       LOWER($3)
FROM recs
WHERE message_count > 0
AND CASE
    WHEN $4 = 'Since_C' THEN created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
    WHEN $4 = 'Max_C' THEN created_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
    WHEN $4 = 'Since_U' THEN updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
    WHEN $4 = 'Max_U' THEN updated_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
    WHEN $4 = 'Init_C' THEN created_at <= NOW()
    WHEN $4 = 'Init_U' THEN updated_at <= NOW()
    ELSE TRUE
    END
ORDER BY
    CASE $4
        WHEN 'Since_C' THEN created_at
        WHEN 'Since_U' THEN updated_at
    END,
    CASE $4
        WHEN 'Max_C' THEN created_at
        WHEN 'Max_U' THEN updated_at
        WHEN 'Init_C' THEN created_at
        WHEN 'Init_U' THEN updated_at
    END DESC
LIMIT $6;
