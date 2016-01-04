SELECT id
FROM offices
WHERE matrix_unique_id = $1
LIMIT 1
