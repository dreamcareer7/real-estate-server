SELECT
    'alert' AS type,
    *,
    ST_AsGeoJSON(location) AS location,
    EXTRACT(EPOCH FROM created_at) AS created_at,
    EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM alerts
WHERE id = $1
