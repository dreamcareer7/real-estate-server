SELECT id,
       'recommendation' AS TYPE,
       MAX(created_at) AS created_at,
       MAX(updated_at) AS updated_at,
       JSON_AGG(referring_user) AS favorited_by,
       object,
       recommendation_type,
       SOURCE,
       source_url,
       referring_alerts,
       referred_shortlist
FROM recommendations
WHERE referring_user = $1
  AND favorited = TRUE
  AND hidden = FALSE
AND CASE
    WHEN $2 = 'Since_C' THEN created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Max_C' THEN created_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Since_U' THEN updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Max_U' THEN updated_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $3 * INTERVAL '1 MICROSECOND'
    WHEN $2 = 'Init_C' THEN created_at < NOW()
    WHEN $2 = 'Init_U' THEN updated_at < NOW()
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
