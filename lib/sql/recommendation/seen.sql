SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM recommendations
WHERE
  COALESCE(ARRAY_LENGTH(referring_alerts, 1), 0) > 0 AND
  recommendations.referring_user = $1 AND
  recommendations.referred_shortlist = $2 AND
  recommendations.status = 'Unpinned'
AND CASE
    WHEN $3 = 'Since_C' THEN created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Max_C' THEN created_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Since_U' THEN updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Max_U' THEN updated_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
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
    END DESC
LIMIT $5;
