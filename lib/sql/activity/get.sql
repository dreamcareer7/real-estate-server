SELECT *,
       'activity' AS type
FROM activities
WHERE id = $1
LIMIT 1
