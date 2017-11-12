WITH recs AS (
    SELECT recommendations.id,
           recommendations.hidden,
           recommendations.created_at,
           recommendations.updated_at,
           recommendations.referring_objects,
           ARRAY_AGG(recommendations_eav."user") FILTER (WHERE recommendations_eav.action = 'Favorited') AS favorited_by
     FROM recommendations
     FULL JOIN recommendations_eav ON recommendations_eav.recommendation = recommendations.id
     WHERE recommendations.room = $2 AND
           recommendations.deleted_at IS NULL AND
           recommendations.hidden = FALSE
     GROUP BY recommendations.id,
              recommendations.hidden,
              recommendations.created_at,
              recommendations.referring_objects
     HAVING
      ARRAY_LENGTH(COALESCE(ARRAY_AGG(recommendations_eav."user") FILTER (WHERE recommendations_eav.action = 'Favorited'), '{}'), 1) > 0
)
SELECT id,
       (SELECT count(*)::integer FROM recs) as total,
       LOWER($1),
       LOWER($3)
FROM recs
WHERE
CASE
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
