SELECT
  id
FROM 
  microsoft_credentials
WHERE
  ( id = 'bb38a5c5-a03c-4259-97f8-eafcb3a01865' AND sync_status is null ) OR
  (
    (
      (last_sync_at <= (NOW() - $1::interval) OR last_sync_at IS NULL)
      AND (sync_status <> 'pending' OR sync_status IS NULL)
    )
    OR
    (
      (last_sync_at <= (NOW() - '3600 seconds'::interval))
      AND sync_status = 'pending'
    )
  )
  AND revoked IS FALSE
  AND deleted_at IS NULL