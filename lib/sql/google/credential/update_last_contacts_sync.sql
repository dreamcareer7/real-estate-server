UPDATE
  google_credentials
SET
  last_contacts_sync_at = $1
WHERE
  id = $2