UPDATE
  google_credentials
SET
  sync_status = $2
WHERE
  id = $1
RETURNING id, sync_status