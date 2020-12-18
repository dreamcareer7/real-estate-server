UPDATE
  google_credentials
SET
  contacts_sync_token = $2
WHERE
  id = $1