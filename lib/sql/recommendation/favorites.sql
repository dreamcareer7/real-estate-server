WITH favs AS
  (SELECT JSON_AGG(CASE WHEN favorited = TRUE THEN referring_user END) AS favorited_by,
          referred_shortlist,
          object,
          BOOL_OR(CASE WHEN status = 'Pinned' THEN TRUE ELSE FALSE END) AS favorited
   FROM recommendations
   WHERE referred_shortlist = $2
   GROUP BY referred_shortlist,
            object
  )
SELECT (COUNT(*) OVER())::INT AS full_count,
       id
FROM recommendations
INNER JOIN favs ON recommendations.referred_shortlist = favs.referred_shortlist
AND recommendations.object = favs.object
WHERE recommendations.referring_user = $1
  AND recommendations.referred_shortlist = $2
  AND favs.favorited = TRUE
ORDER BY created_at DESC LIMIT $3
OFFSET $4
