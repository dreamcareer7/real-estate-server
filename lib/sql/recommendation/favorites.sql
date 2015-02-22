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
SELECT id
FROM recommendations
INNER JOIN favs ON recommendations.referred_shortlist = favs.referred_shortlist
AND recommendations.object = favs.object
WHERE recommendations.referring_user = $1
  AND recommendations.referred_shortlist = $2
  AND favs.favorited = TRUE
AND CASE
    WHEN $3 = 'Since' THEN uuid_timestamp(id) > uuid_timestamp($4)
    WHEN $3 = 'Max' THEN uuid_timestamp(id) < uuid_timestamp($4)
    ELSE TRUE
    END
ORDER BY
    CASE WHEN $5 THEN created_at END,
    CASE WHEN NOT $5 THEN created_at END DESC
LIMIT $6;
