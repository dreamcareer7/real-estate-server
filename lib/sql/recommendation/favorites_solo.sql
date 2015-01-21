SELECT id,
       (COUNT(*) OVER())::INT AS full_count,
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
  AND favorited = TRUE
GROUP BY OBJECT,
         message_thread,
         recommendation_type,
         SOURCE,
         source_url,
         referring_savedsearch,
         referred_shortlist
ORDER BY created_at DESC LIMIT $2
OFFSET $3
