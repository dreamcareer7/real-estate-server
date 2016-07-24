SELECT
  'office' as type,
  name,
  brand
FROM offices
WHERE id = $1
LIMIT 1
