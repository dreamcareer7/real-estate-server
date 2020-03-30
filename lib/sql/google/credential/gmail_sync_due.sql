SELECT
  id
FROM 
  google_credentials
WHERE
  (
    (
      (last_sync_at <= (NOW() - $1::interval) OR last_sync_at IS NULL)
      AND (sync_status = 'success' OR sync_status = 'failed' OR sync_status IS NULL)
    )
    OR
    (
      ((last_sync_at <= (NOW() - '24 hours'::interval)) OR (last_sync_at IS NULl))
      AND sync_status = 'pending'
    )
  )
  AND revoked IS FALSE
  AND deleted_at IS NULL