SELECT id,
       'recommendation' AS TYPE,
       MAX(created_at) AS created_at,
       MAX(updated_at) AS updated_at,
       JSON_AGG(referring_user) AS favorited_by,
       object,
       recommendation_type,
       SOURCE,
       source_url,
       referring_savedsearch,
       referred_shortlist
FROM recommendations
WHERE referring_user = $1
  AND status = 'Pinned'
AND CASE
    WHEN $2 = 'Since_C' THEN created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Max_C' THEN created_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Since_U' THEN updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Max_U' THEN updated_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
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
    END DESC
LIMIT $4;
