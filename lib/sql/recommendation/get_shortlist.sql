WITH favs AS
  (SELECT JSON_AGG(CASE WHEN favorited = TRUE THEN referring_user END) AS favorited_by,
          JSON_AGG(CASE WHEN added_tour = TRUE THEN referring_user END) AS requested_by,
          BOOL_OR(favorited) AS favorited,
          BOOL_OR(added_tour) AS tour_requested,
          referred_shortlist,
          object
   FROM recommendations
   WHERE referred_shortlist = $2
   GROUP BY referred_shortlist,
            object
  )
SELECT 'recommendation' AS TYPE,
       recommendations.id,
       recommendations.recommendation_type,
       recommendations.source,
       recommendations.source_url,
       recommendations.referring_user,
       recommendations.referred_shortlist,
       recommendations.referring_alerts,
       recommendations.object,
       recommendations.message_room,
       recommendations.read,
       recommendations.favorited,
       recommendations.hidden,
       recommendations.added_tour,
       favs.favorited_by AS favorited_by,
       favs.requested_by AS requested_by,
       favs.favorited AS favorited_some,
       favs.tour_requested AS tour_requested,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM recommendations
INNER JOIN favs ON recommendations.referred_shortlist = favs.referred_shortlist
AND recommendations.object = favs.object
WHERE id = $1
