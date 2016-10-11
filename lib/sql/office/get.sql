SELECT
  id,
  'office' as type,
  name,
  mls_id
FROM offices
WHERE id = $1
LIMIT 1
