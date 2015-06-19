WITH favs AS
  (SELECT JSON_AGG(CASE WHEN favorited = TRUE THEN referring_user END) AS favorited_by,
          referred_shortlist,
          object,
          MAX(updated_at) AS updated_at,
          BOOL_OR(CASE WHEN status = 'Pinned' THEN TRUE ELSE FALSE END) AS favorited
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
  AND recommendations.hidden = FALSE
  AND favs.favorited = TRUE
AND CASE
    WHEN $3 = 'Since_C' THEN recommendations.created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Max_C' THEN recommendations.created_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Since_U' THEN recommendations.updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    WHEN $3 = 'Max_U' THEN recommendations.updated_at < TIMESTAMP WITH TIME ZONE 'EPOCH' + $4 * INTERVAL '1 MICROSECOND'
    ELSE TRUE
    END
ORDER BY
    CASE $3
        WHEN 'Since_C' THEN recommendations.created_at
        WHEN 'Since_U' THEN recommendations.updated_at
    END,
    CASE $3
        WHEN 'Max_C' THEN recommendations.created_at
        WHEN 'Max_U' THEN recommendations.updated_at
    END DESC
LIMIT $5;
