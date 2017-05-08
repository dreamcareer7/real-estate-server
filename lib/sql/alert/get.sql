SELECT *,
       'alert' AS type,
       (
         SELECT COUNT(recommendations.id)
         FROM recommendations
         LEFT JOIN recommendations_eav
           ON recommendations.id = recommendations_eav.recommendation AND
           (
             CASE WHEN $2::uuid IS NOT NULL THEN recommendations_eav."user" = $2 ELSE FALSE END
           ) AND
           recommendations_eav.action = 'Read'
         WHERE recommendations_eav.id IS NULL AND
               recommendations.deleted_at IS NULL AND
               recommendations.hidden IS FALSE AND
               COALESCE(ARRAY_LENGTH(recommendations.referring_objects, 1), 0) > 0 AND
               ARRAY[alerts.id] <@ recommendations.referring_objects
       ) AS new_recommendations,
       (
         SELECT url FROM photos
         INNER JOIN recommendations
           ON photos.listing_mui = recommendations.matrix_unique_id
         WHERE ARRAY[alerts.id] <@ recommendations.referring_objects
         ORDER BY recommendations.updated_at DESC
         LIMIT 1
       ) as cover_image_url,
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
JOIN unnest($1::uuid[]) WITH ORDINALITY t(aid, ord) ON alerts.id = aid
ORDER BY t.ord
