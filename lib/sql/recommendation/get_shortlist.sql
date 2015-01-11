WITH favs AS
  (SELECT JSON_AGG(CASE WHEN status = 'Favorited' THEN referring_user END) AS favorited_by,
          referred_shortlist,
          object,
          BOOL_OR(CASE WHEN status = 'Favorited' THEN TRUE ELSE FALSE END) AS favorited
   FROM recommendations
   WHERE referred_shortlist = $2
   GROUP BY referred_shortlist,
            object )
SELECT 'recommendation' AS TYPE,
       recommendations.id,
       recommendations.recommendation_type,
       recommendations.source,
       recommendations.source_url,
       recommendations.referring_user,
       recommendations.referred_shortlist,
       recommendations.referring_savedsearch,
       recommendations.object,
                       recommendations.message_thread,
                       recommendations.hidden,
                       recommendations.status,
                       favs.favorited_by,
                       EXTRACT(EPOCH
                               FROM created_at)::INT AS created_at,
                       EXTRACT(EPOCH
                               FROM updated_at)::INT AS updated_at
FROM recommendations
INNER JOIN favs ON recommendations.referred_shortlist = favs.referred_shortlist
AND recommendations.object = favs.object
WHERE id = $1
