SELECT 'recommendation' AS TYPE,
       id,
       source,
       source_url,
       referred_user,
       referring_alerts,
       referred_shortlist,
       object,
       message_room,
       recommendation_type,
       status,
       favorited,
       hidden,
       read,
       added_tour,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM recommendations
WHERE id = $1
