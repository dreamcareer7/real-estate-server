SELECT 'agency' AS TYPE,
       agencies.*,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
FROM agencies
WHERE id = $1
