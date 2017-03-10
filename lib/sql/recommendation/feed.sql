WITH recs AS (
    SELECT id,
           CASE WHEN
           (
             SELECT id
             FROM recommendations_eav
             WHERE recommendation = recommendations.id AND
                   action = 'Read' AND
                   "user" = $1
             LIMIT 1
           ) IS NULL THEN FALSE ELSE TRUE END AS read,
           created_at,
           updated_at
     FROM recommendations
     WHERE recommendations.room = $2 AND
           recommendations.deleted_at IS NULL AND
           recommendations.hidden = FALSE AND
           COALESCE(ARRAY_LENGTH(recommendations.referring_objects, 1), 0) > 0 AND
           CASE
             WHEN $3::uuid[] IS NULL THEN TRUE
             ELSE $3::uuid[] <@ referring_objects
           END
)
SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM recs
WHERE
CASE
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
LIMIT $6
