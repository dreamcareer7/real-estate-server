SELECT *,
       'alert' AS type,
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
