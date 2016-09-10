SELECT brand
FROM brands_hostnames
WHERE hostname = $1::text
LIMIT 1