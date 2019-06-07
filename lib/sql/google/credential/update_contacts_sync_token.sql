UPDATE
  google_credentials
SET
  contacts_sync_token = $2,
  updated_at = $3
WHERE
  id = $1