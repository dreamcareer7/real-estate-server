WITH favs AS
  (SELECT JSON_AGG(CASE WHEN favorited = TRUE THEN referring_user END) AS favorited_by,
          JSON_AGG(CASE WHEN added_tour = TRUE THEN referring_user END) AS added_tour_by,
          referred_shortlist,
          object,
          MAX(updated_at) AS updated_at,
          MAX(created_at) AS created_at,
          BOOL_OR(favorited) AS favorited,
          BOOL_OR(added_tour) AS added_tour
   FROM recommendations
   WHERE referred_shortlist = $2
   GROUP BY referred_shortlist,
            object
  )
SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM recommendations
INNER JOIN favs ON recommendations.referred_shortlist = favs.referred_shortlist
AND recommendations.object = favs.object
WHERE recommendations.referring_user = $1
  AND recommendations.referred_shortlist = $2
  AND favs.added_tour = TRUE
AND CASE
    WHEN $3 = 'Since_C' THEN recommendations.created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Max_C' THEN recommendations.created_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Since_U' THEN recommendations.updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Max_U' THEN recommendations.updated_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Init_C' THEN recommendations.created_at < NOW()
    WHEN $3 = 'Init_U' THEN recommendations.updated_at < NOW()
    ELSE TRUE
    END
ORDER BY
    CASE $3
        WHEN 'Since_C' THEN favs.created_at
        WHEN 'Since_U' THEN favs.updated_at
    END,
    CASE $3
        WHEN 'Max_C' THEN favs.created_at
        WHEN 'Max_U' THEN favs.updated_at
        WHEN 'Init_C' THEN favs.created_at
        WHEN 'Init_U' THEN favs.updated_at
    END DESC
LIMIT $5;
