SELECT 'recommendation' AS TYPE,
       id,
       source,
       source_url,
       referring_user,
       referring_savedsearch,
       referred_shortlist,
       object,
       message_thread,
       recommendation_type,
       status,
       EXTRACT(EPOCH FROM created_at)::INT AS created_at,
       EXTRACT(EPOCH FROM updated_at)::INT AS updated_at
FROM recommendations
WHERE id = $1
