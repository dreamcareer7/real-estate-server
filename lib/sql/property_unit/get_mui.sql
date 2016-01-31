SELECT id
FROM units
WHERE matrix_unique_id = $1
LIMIT 1
