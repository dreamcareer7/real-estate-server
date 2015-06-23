SELECT id
FROM addresses
WHERE location IS null AND
      matrix_unique_id IS NOT NULL
ORDER BY created_at DESC
LIMIT $1
