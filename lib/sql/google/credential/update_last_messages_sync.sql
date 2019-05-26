UPDATE
  google_credentials
SET
  last_messages_sync_at = $1
WHERE
  id = $2