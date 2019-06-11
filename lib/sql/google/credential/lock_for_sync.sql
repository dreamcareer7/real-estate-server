UPDATE
  google_credentials
SET
  sync_lock = $2
WHERE
  id = $1