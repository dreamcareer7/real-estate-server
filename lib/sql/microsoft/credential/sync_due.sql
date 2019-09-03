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
  AND revoked IS FALSE
  AND sync_status <> 'pending'
  AND deleted_at IS NULL