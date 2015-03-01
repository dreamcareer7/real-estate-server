SELECT *,
       'address' AS TYPE,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM addresses
WHERE id = $1 LIMIT 1
