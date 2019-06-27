SELECT
  id
FROM 
  google_credentials
WHERE 
  (
    last_sync_at <= (NOW() - $1::interval)
    OR
    last_sync_at IS NULL
  )
  AND id = '230f2da0-20fc-48be-b09d-6f66ab488e65'