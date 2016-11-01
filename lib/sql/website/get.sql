SELECT *,
  'website' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  (
    SELECT ARRAY_AGG(hostname ORDER BY "default" DESC) FROM websites_hostnames WHERE website = $1
  ) AS hostnames
FROM websites
WHERE id = $1
LIMIT 1
