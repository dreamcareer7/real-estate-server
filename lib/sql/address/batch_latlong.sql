SELECT id
FROM addresses
WHERE location IS null
ORDER BY created_at
LIMIT $1
