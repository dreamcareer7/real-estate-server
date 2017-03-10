WITH recs AS
(
  SELECT recommendations.id AS id
  FROM recommendations
  LEFT JOIN recommendations_eav
  ON recommendations.id = recommendations_eav.recommendation AND
     (CASE WHEN $2::uuid IS NOT NULL THEN recommendations_eav."user" = $2 ELSE FALSE END) AND
     recommendations_eav.action = 'Read'
  WHERE room = (SELECT room FROM alerts WHERE id = $1 LIMIT 1) AND
        recommendations_eav.id IS NULL AND
        recommendations.deleted_at IS NULL AND
        recommendations.hidden IS FALSE AND
        COALESCE(ARRAY_LENGTH(recommendations.referring_objects, 1), 0) > 0 AND
        ARRAY[$1] <@ recommendations.referring_objects
)
SELECT *,
       'alert' AS type,
       CASE WHEN $2::uuid IS NULL THEN 0 ELSE (SELECT COUNT(*)::INT FROM recs) END AS new_recommendations,
       ST_AsGeoJSON(points) AS points,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
       EXTRACT(EPOCH FROM minimum_sold_date) AS minimum_sold_date,
       property_types::text[] AS property_types,
       property_subtypes::text[] AS property_subtypes,
       listing_statuses::text[] AS listing_statuses,
       excluded_listing_ids::uuid[] AS excluded_listing_ids
FROM alerts
WHERE id = $1
LIMIT 1
