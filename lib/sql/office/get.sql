SELECT
  'office' as type,
  name
FROM offices
WHERE id = $1
LIMIT 1
