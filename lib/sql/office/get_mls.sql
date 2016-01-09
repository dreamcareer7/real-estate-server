SELECT  'office' AS type,
offices.* FROM offices
WHERE mls_id = $1
LIMIT 1
