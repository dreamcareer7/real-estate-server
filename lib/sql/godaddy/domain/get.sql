SELECT godaddy_domains.*,
       'domain' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM godaddy_domains
WHERE id = $1
LIMIT 1
