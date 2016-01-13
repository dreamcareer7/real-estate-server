SELECT id
FROM property_rooms
WHERE matrix_unique_id = $1
LIMIT 1
