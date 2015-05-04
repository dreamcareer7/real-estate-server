SELECT 'property' AS TYPE,
       properties.*,
       EXTRACT(EPOCH FROM properties.created_at) AS created_at,
       EXTRACT(EPOCH FROM properties.updated_at) AS updated_at
FROM properties
WHERE properties.id = $1
