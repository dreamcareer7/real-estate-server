SELECT id
FROM listings
WHERE mls_number = $1
LIMIT 1
