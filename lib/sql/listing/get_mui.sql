SELECT id
FROM listings
WHERE matrix_unique_id = $1
LIMIT 1
