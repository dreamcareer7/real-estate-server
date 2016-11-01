SELECT website
FROM websites_hostnames
WHERE LOWER(hostname) = LOWER($1::text)
LIMIT 1