SELECT id
FROM listings
WHERE matrix_unique_id = $1 AND mls = $2
LIMIT 1
