SELECT id
FROM addresses
WHERE matrix_unique_id = $1
LIMIT 1
