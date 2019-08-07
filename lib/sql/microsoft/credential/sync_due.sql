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
  AND id = '4da36a02-e030-42cc-accb-638b103d9919'