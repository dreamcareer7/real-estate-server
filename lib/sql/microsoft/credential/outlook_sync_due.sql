-- deprecated. we use users_jobs row level lock

SELECT
  id
FROM 
  microsoft_credentials
WHERE
  (
    (
      (last_sync_at <= (NOW() - $1::interval) OR last_sync_at IS NULL)
      AND (sync_status = 'success' OR sync_status = 'failed' OR sync_status IS NULL)
    )
    OR
    (
      (last_sync_at <= (NOW() - '2 hours'::interval))
      AND sync_status = 'pending'
    )
  )
  AND revoked IS FALSE
  AND deleted_at IS NULL