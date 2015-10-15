SELECT 'recommendation' AS TYPE,
       recommendations.id,
       recommendations.source,
       recommendations.source_url,
       recommendations.referring_alerts,
       recommendations.room,
       recommendations.listing,
       recommendations.recommendation_type,
       recommendations.hidden,
       EXTRACT(EPOCH FROM recommendations.created_at) AS created_at,
       EXTRACT(EPOCH FROM recommendations.updated_at) AS updated_at,
       EXTRACT(EPOCH FROM recommendations.deleted_at) AS deleted_at,
       json_agg(recommendations_eav."user") FILTER (WHERE recommendations_eav.action = 'Read') AS read_by,
       json_agg(recommendations_eav."user") FILTER (WHERE recommendations_eav.action = 'Favorited') AS favorited_by,
       json_agg(recommendations_eav."user") FILTER (WHERE recommendations_eav.action = 'TourRequested') AS tour_requested_by
FROM recommendations
FULL JOIN recommendations_eav ON
    recommendations.id = recommendations_eav.recommendation
WHERE recommendations.id = $1
GROUP BY recommendations.id,
         recommendations.source,
         recommendations.source_url,
         recommendations.referring_alerts,
         recommendations.room,
         recommendations.listing,
         recommendations.recommendation_type,
         recommendations.hidden,
         recommendations.created_at,
         recommendations.updated_at
LIMIT 1
