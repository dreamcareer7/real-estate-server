WITH recs AS (
    SELECT recommendations.id,
           recommendations.hidden,
           recommendations.created_at,
           recommendations.referring_objects,
           ARRAY_AGG(recommendations_eav."user") FILTER (WHERE recommendations_eav.action = 'Favorited') AS favorited_by,
           MAX(recommendations_eav.created_at) FILTER (WHERE recommendations_eav.action = 'Favorited') AS updated_at
     FROM recommendations
     FULL JOIN recommendations_eav ON recommendations_eav.recommendation = recommendations.id
     WHERE recommendations.room = $2 AND
           recommendations.deleted_at IS NULL AND
           recommendations.hidden = FALSE
     GROUP BY recommendations.id,
              recommendations.hidden,
              recommendations.created_at,
              recommendations.referring_objects
)
SELECT id,
       (COUNT(*) OVER())::INT AS total,
       LOWER($1),
       LOWER($3)
FROM recs
WHERE ARRAY_LENGTH(COALESCE(favorited_by, '{}'), 1) > 0
AND CASE
    WHEN $4 = 'Since_C' THEN created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
    WHEN $4 = 'Max_C' THEN created_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
    WHEN $4 = 'Since_U' THEN updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
    WHEN $4 = 'Max_U' THEN updated_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
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
