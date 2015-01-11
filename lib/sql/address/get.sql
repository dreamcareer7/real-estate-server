SELECT *,
       'address' AS TYPE
FROM addresses
WHERE id = $1 LIMIT 1
