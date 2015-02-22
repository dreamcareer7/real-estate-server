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
    WHEN $2 = 'Since' THEN uuid_timestamp(id) > uuid_timestamp($3)
    WHEN $2 = 'Max' THEN uuid_timestamp(id) < uuid_timestamp($3)
    ELSE TRUE
    END
GROUP BY object,
         message_room,
         recommendation_type,
         source,
         source_url,
         referring_savedsearch,
         referred_shortlist
ORDER BY
    CASE WHEN $4 THEN created_at END,
    CASE WHEN NOT $4 THEN created_at END DESC
LIMIT $5;
