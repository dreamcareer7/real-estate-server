WITH recs AS (
    SELECT recommendations.id,
           recommendations.hidden,
           recommendations.created_at,
           recommendations.updated_at,
           recommendations.referring_objects,
           ARRAY_AGG(recommendations_eav."user") FILTER (WHERE recommendations_eav.action = 'Read') AS read_by
     FROM recommendations
     FULL JOIN recommendations_eav ON recommendations_eav.recommendation = recommendations.id
     WHERE recommendations.room = $2 AND
           recommendations.deleted_at IS NULL AND
           recommendations.hidden = FALSE AND
           COALESCE(ARRAY_LENGTH(recommendations.referring_objects, 1), 0) > 0
     GROUP BY recommendations.id,
              recommendations.hidden,
              recommendations.created_at,
              recommendations.updated_at,
              recommendations.referring_objects
)
SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM recs
WHERE (NOT ($1 = ANY (COALESCE(read_by, '{}'))))
AND CASE
    WHEN $3 = 'Since_C' THEN created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Max_C' THEN created_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Since_U' THEN updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Max_U' THEN updated_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Init_C' THEN created_at < NOW()
    WHEN $3 = 'Init_U' THEN updated_at < NOW()
    ELSE TRUE
    END
ORDER BY
    CASE $3
        WHEN 'Since_C' THEN created_at
        WHEN 'Since_U' THEN updated_at
    END,
    CASE $3
        WHEN 'Max_C' THEN created_at
        WHEN 'Max_U' THEN updated_at
        WHEN 'Init_C' THEN created_at
        WHEN 'Init_U' THEN updated_at
    END DESC
LIMIT $5;
