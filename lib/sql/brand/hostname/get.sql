SELECT brand
FROM brands_hostnames
WHERE LOWER(hostname) = LOWER($1::text)
LIMIT 1