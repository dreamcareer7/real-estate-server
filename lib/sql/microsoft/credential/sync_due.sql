SELECT
  id
FROM 
  microsoft_credentials
WHERE 
  (
    last_sync_at <= (NOW() - $1::interval)
    OR
    last_sync_at IS NULL
  )
  AND id = '4f118b86-4353-4d4b-b4ba-0b2eb963a63c'