SELECT id
FROM brands
WHERE subdomain = $1::text
LIMIT 1