WITH recs AS (
    SELECT recommendations.id,
           recommendations.hidden,
           recommendations.created_at,
           recommendations.updated_at,
           recommendations.referring_alerts,
           ARRAY_AGG(recommendations_eav."user") FILTER (WHERE recommendations_eav.action = 'Favorited') AS favorited_by
     FROM recommendations
     FULL JOIN recommendations_eav ON recommendations_eav.recommendation = recommendations.id
     WHERE recommendations.room = $2 AND
           recommendations.deleted_at IS NULL AND
           recommendations.hidden = FALSE
     GROUP BY recommendations.id,
              recommendations.hidden,
              recommendations.created_at,
              recommendations.updated_at,
              recommendations.referring_alerts
)
SELECT id,
       (COUNT(*) OVER())::INT AS total,
       lower($1)
FROM recs
WHERE ARRAY_LENGTH(COALESCE(favorited_by, '{}'), 1) > 0
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
    END
LIMIT $5;
