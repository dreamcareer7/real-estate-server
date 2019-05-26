SELECT
  id
FROM 
  google_credentials
WHERE 
  (
    last_contacts_sync_at >= (NOW() - $1::interval)
    OR
    last_contacts_sync_at IS NULL
  )
  AND login_status IS TRUE
  AND deleted_at IS NULL
