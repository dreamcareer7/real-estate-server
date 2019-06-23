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
  AND id = 'e52ba2f4-3f91-48c5-89a3-9abdd2b01082'