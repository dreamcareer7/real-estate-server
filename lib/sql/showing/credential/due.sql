SELECT
  id
FROM 
  showings_credentials
WHERE 
  (
    last_crawled_at >= (NOW() - $1::interval)
    OR
    last_crawled_at IS NULL
  )
  AND login_status IS TRUE
  AND deleted_at IS NULL
