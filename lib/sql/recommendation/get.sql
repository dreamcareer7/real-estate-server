SELECT 'recommendation' AS TYPE,
       recommendations.*,
       EXTRACT(EPOCH
               FROM created_at)::INT AS created_at,
       EXTRACT(EPOCH
               FROM updated_at)::INT AS updated_at
FROM recommendations
WHERE id = $1
