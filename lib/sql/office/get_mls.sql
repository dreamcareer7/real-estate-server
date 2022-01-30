SELECT  'office' AS type,
offices.* FROM offices
WHERE mls_id = $1
AND CASE $2::mls IS NULL THEN TRUE ELSE mls = $2::mls END
LIMIT 1
