SELECT id
FROM properties
WHERE matrix_unique_id = $1
LIMIT 1
